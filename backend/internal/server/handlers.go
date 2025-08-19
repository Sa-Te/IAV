package server

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/Sa-Te/IAV/backend/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func (s *APIServer) loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	//decode the request and put it into a new user struct
	var reqBody struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&reqBody)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var userId int
	var storedHash string
	sqlStatement := `SELECT id, password_hash FROM users WHERE email= $1`

	//get the single row from DB
	err = s.db.QueryRow(context.Background(), sqlStatement, reqBody.Email).Scan(&userId, &storedHash)
	if err != nil {
		// This handles both "user not found" and other database errors.
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(reqBody.Password))

	if err != nil {
		http.Error(w, "Password Error or User not found", http.StatusUnauthorized)
		return
	}

	//create a token with claims
	claims := jwt.MapClaims{
		"userID": userId,
		"exp":    time.Now().Add(time.Hour * 24).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	//sign the token
	var secretKey = []byte("complete-random-string-that-is-ver-long")
	tokenString, err := token.SignedString(secretKey)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"token": tokenString})

}

func (s *APIServer) registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	type requestBody struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	var body requestBody

	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		http.Error(w, "Invalid request Body", http.StatusBadRequest)
		return

	}

	hashedPass, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	sqlStatement := `INSERT INTO users(email, password_hash) VALUES ($1, $2)`
	_, err = s.db.Exec(context.Background(), sqlStatement, body.Email, string(hashedPass))
	if err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User created successfully"})
}

func (s *APIServer) uploadHandler(w http.ResponseWriter, r *http.Request) {
	//read the uploaded file
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		http.Error(w, "Could not get user ID from context", http.StatusInternalServerError)
		return
	}

	err := r.ParseMultipartForm(32 << 20)
	if err != nil {
		http.Error(w, "The uploaded file is too big", http.StatusBadRequest)
		return
	}

	fileName, handler, err := r.FormFile("archiveFile")
	if err != nil {
		http.Error(w, "Invalid file key. Expected 'archiveFile'.", http.StatusBadRequest)
		return
	}
	defer fileName.Close()

	log.Printf("Uploaded File: %s, Size: %d\n", handler.Filename, handler.Size)

	//save the file to disk
	dst, err := os.Create("temp-archive.zip")
	if err != nil {
		fmt.Println(w, "Failed to create file on server", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	//copy uploaded files to the new file
	_, err = io.Copy(dst, fileName)
	if err != nil {
		http.Error(w, "Failed to save the file", http.StatusInternalServerError)
		return
	}

	//send back success message
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "File uploaded, processing started..."})

	s.processArchive("temp-archive.zip", userID)

}

func (s *APIServer) processArchive(filepath string, userID int) {
	r, err := zip.OpenReader(filepath)
	if err != nil {
		log.Printf("Failed to open zip archive: %v", err)
		return
	}
	defer r.Close()

	log.Println("--- Archive Contents ---")
	for _, f := range r.File {
		if f.Name == "your_instagram_activity/media/posts_1.json" {
			log.Println("Found posts_1.json, starting to parse...")

			postFile, err := f.Open()
			if err != nil {
				log.Printf("Failed to open posts_1.json from zip: %v", err)
				continue
			}

			var postWrappers []models.InstagramPostWrapper

			err = json.NewDecoder(postFile).Decode(&postWrappers)
			if err != nil {
				log.Printf("Failed to decode posts_1.json: %v", err)
				postFile.Close()
				continue
			}
			postFile.Close()

			log.Println("--- Inserting Posts into Database ---")

			for _, wrapper := range postWrappers {
				for _, post := range wrapper.Media {
					sqlStatement := `INSERT INTO media_items (user_id, uri, caption, taken_at, media_type) VALUES ($1, $2, $3, $4, $5)`
					takenAt := time.Unix(post.CreationTimeStamp, 0)

					_, err := s.db.Exec(context.Background(), sqlStatement, userID, post.URI, post.Title, takenAt, "post")
					if err != nil {
						log.Printf("Failed to insert post with URI %s: %v\n", post.URI, err)
					} else {
						log.Printf("Successfully inserted post: %s\n", post.Title)
					}
				}
			}

			log.Println("--- Finished Inserting Posts ---")
		}

		if f.Name == "your_instagram_activity/media/stories.json" {
			log.Println("Found stories.json, starting to parse...")

			storiesFile, err := f.Open()
			if err != nil {
				log.Printf("Failed to open stories.json from zip: %v", err)
				continue
			}

			var storyWrapper models.InstagramStoryWrapper

			err = json.NewDecoder(storiesFile).Decode(&storyWrapper)
			if err != nil {
				log.Printf("Failed to decode stories.json: %v", err)
				storiesFile.Close()
				continue
			}
			storiesFile.Close()

			log.Println("--- Inserting Stories into Database ---")

			for _, story := range storyWrapper.Stories {
				sqlStatement := `INSERT INTO media_items (user_id, uri, caption, taken_at, media_type) VALUES ($1, $2, $3, $4, $5)`
				takenAt := time.Unix(story.CreationTimeStamp, 0)

				_, err := s.db.Exec(context.Background(), sqlStatement, userID, story.URI, story.Title, takenAt, "story")

				if err != nil {
					log.Printf("Failed to insert story with URI %s: %v\n", story.URI, err)
				} else {
					log.Printf("Successfully inserted story: %s\n", story.Title)
				}
			}

			log.Println("--- Finished Inserting Stories ---")
		}
	}
}

func (s *APIServer) getMediaItemsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		http.Error(w, "Could not get user ID from context", http.StatusInternalServerError)
		return
	}

	sqlStatement := `SELECT id, user_id, uri, caption, taken_at, media_type FROM media_items WHERE user_id=$1`

	rows, err := s.db.Query(context.Background(), sqlStatement, userID)
	if err != nil {
		http.Error(w, "Failed to get media items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	mediaItems := make([]models.MediaItem, 0)

	for rows.Next() {
		var item models.MediaItem

		err := rows.Scan(&item.ID, &item.UserID, &item.URI, &item.Caption, &item.TakenAt, &item.MediaType)
		if err != nil {
			log.Printf("Failed to scan row: %v", err)
			continue //skip the row if error
		}

		mediaItems = append(mediaItems, item)

	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(mediaItems)
}
