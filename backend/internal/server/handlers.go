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
	"path/filepath"
	"strings"
	"time"

	"github.com/Sa-Te/IAV/backend/internal/models"
	"github.com/golang-jwt/jwt/v5"

	"golang.org/x/crypto/bcrypt"
	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/transform"
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

	err := r.ParseMultipartForm(32 << 20) //32MB max file size
	if err != nil {
		http.Error(w, "The uploaded file is too big", http.StatusBadRequest)
		return
	}

	fileName, _, err := r.FormFile("archiveFile")
	if err != nil {
		http.Error(w, "Invalid file key. Expected 'archiveFile'.", http.StatusBadRequest)
		return
	}
	defer fileName.Close()

	//dedicated directory for user's unzipped files
	userUploadDir := fmt.Sprintf("uploads/%d", userID)
	if err := os.MkdirAll(userUploadDir, os.ModePerm); err != nil {
		log.Printf("Failed to create user upload directory: %v", err)
		http.Error(w, "Failed to process file on server.", http.StatusInternalServerError)
		return
	}

	//save the file to temporary disk
	tempZipPath := filepath.Join(userUploadDir, "temp-archive.zip")
	dst, err := os.Create(tempZipPath)
	if err != nil {
		http.Error(w, "Failed to create temp file on server.", http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	defer os.Remove(tempZipPath)

	_, err = io.Copy(dst, fileName)
	if err != nil {
		dst.Close()
		http.Error(w, "Failed to save the file", http.StatusInternalServerError)
		return
	}
	dst.Close()

	//unzip the archive into user's dir
	if err := unzip(tempZipPath, userUploadDir); err != nil {
		log.Printf("Failed to unzip archive: %v", err)
		http.Error(w, "Failed to process archive.", http.StatusInternalServerError)
		return
	}

	s.processArchive(tempZipPath, userID)

	os.Remove(tempZipPath)

	//send back success message
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "File uploaded, processed successfully."})

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

			transformer := charmap.ISO8859_1.NewDecoder()
			transformReader := transform.NewReader(postFile, transformer)

			var postWrappers []models.InstagramPostWrapper
			if err := json.NewDecoder(transformReader).Decode(&postWrappers); err != nil {
				log.Printf("Failed to decode posts_1.json: %v", err)
				postFile.Close()
				continue
			}
			postFile.Close()

			log.Println("--- Inserting/Updating Posts in Database ---")

			for _, wrapper := range postWrappers {
				for _, post := range wrapper.Media {
					sqlStatement := `INSERT INTO media_items (user_id, uri, caption, taken_at, media_type) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, uri) DO NOTHING;`
					takenAt := time.Unix(post.CreationTimeStamp, 0)

					_, err := s.db.Exec(context.Background(), sqlStatement, userID, post.URI, post.Title, takenAt, "post")
					if err != nil {
						log.Printf("Failed to insert post with URI %s: %v\n", post.URI, err)
					} else {
						log.Printf("Successfully inserted post: %s\n", post.Title)
					}
				}
			}

			log.Println("--- Finished Processing Posts ---")
		}

		if f.Name == "your_instagram_activity/media/stories.json" {
			log.Println("Found stories.json, starting to parse...")

			storiesFile, err := f.Open()
			if err != nil {
				log.Printf("Failed to open stories.json from zip: %v", err)
				continue
			}

			transformer := charmap.ISO8859_1.NewDecoder()
			transformReader := transform.NewReader(storiesFile, transformer)

			var storyWrapper models.InstagramStoryWrapper
			if err := json.NewDecoder(transformReader).Decode(&storyWrapper); err != nil {
				log.Printf("Failed to decode stories.json: %v", err)
				storiesFile.Close()
				continue
			}
			storiesFile.Close()

			log.Println("--- Inserting Stories into Database ---")

			for _, story := range storyWrapper.Stories {
				sqlStatement := `INSERT INTO media_items (user_id, uri, caption, taken_at, media_type) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, uri) DO NOTHING;`
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

		if f.Name == "connections/contacts/synced_contacts.json" {
			log.Println("Found synced_contacts.json, starting to parse...")
			contactFile, err := f.Open()
			if err != nil {
				continue
			}

			var contactsWrapper models.SyncedContactsWrapper
			if err := json.NewDecoder(contactFile).Decode(&contactsWrapper); err != nil {
				log.Printf("Failed to decode synced_contacts.json: %v", err)
				contactFile.Close()
				continue
			}
			contactFile.Close()

			log.Println("--- Inserting Synced Contacts into Database ---")
			for _, contactItem := range contactsWrapper.ContactInfo {
				contactName := strings.TrimSpace(contactItem.StringMapData.FirstName.Value + " " + contactItem.StringMapData.LastName.Value)
				if contactName == "" {
					continue
				}

				sqlStatement := `INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, username, connection_type) DO NOTHING;`
				_, err := s.db.Exec(context.Background(), sqlStatement, userID, contactName, "contact", time.Now())
				if err != nil {
					log.Printf("Failed to upsert contact %s: %v\n", contactName, err)
				}
			}
			log.Println("--- Finished Processing Synced Contacts ---")
		}

		if f.Name == "connections/followers_and_following/followers_1.json" {
			log.Println("Found followers_1.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var followers []models.Relationship
			if err := json.NewDecoder(file).Decode(&followers); err != nil {
				log.Printf("Failed to decode followers_1.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			log.Println("--- Inserting Followers into Database ---")
			for _, item := range followers {
				for _, stringData := range item.StringListData {
					sqlStatement := `INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, username, connection_type) DO NOTHING;`
					timestamp := time.Unix(stringData.Timestamp, 0)
					_, err := s.db.Exec(context.Background(), sqlStatement, userID, stringData.Value, "follower", timestamp)
					if err != nil {
						log.Printf("Failed to upsert follower %s: %v\n", stringData.Value, err)
					}
				}
			}
			log.Println("--- Finished Processing Followers ---")
		}

		if f.Name == "connections/followers_and_following/following.json" {
			log.Println("Found following.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var followingWrapper map[string][]models.Relationship
			if err := json.NewDecoder(file).Decode(&followingWrapper); err != nil {
				log.Printf("Failed to decode following.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			var following []models.Relationship
			for _, v := range followingWrapper {
				following = v
				break
			}

			log.Println("--- Inserting Following into Database ---")
			for _, item := range following {
				for _, stringData := range item.StringListData {
					sqlStatement := `INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, username, connection_type) DO NOTHING;`
					timestamp := time.Unix(stringData.Timestamp, 0)
					_, err := s.db.Exec(context.Background(), sqlStatement, userID, stringData.Value, "following", timestamp)
					if err != nil {
						log.Printf("Failed to upsert following %s: %v\n", stringData.Value, err)
					}
				}
			}
			log.Println("--- Finished Processing Following ---")
		}

	}
}

func (s *APIServer) getConnectionsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		http.Error(w, "Could not get user ID from context", http.StatusInternalServerError)
		return
	}

	sqlStatement := `SELECT id, user_id, username, connection_type, timestamp FROM connections WHERE user_id=$1`

	rows, err := s.db.Query(context.Background(), sqlStatement, userID)
	if err != nil {
		log.Printf("Database query error in getConnectionsHandler: %v", err)
		http.Error(w, "Failed to get connections", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	connections := make([]models.Connection, 0)
	for rows.Next() {
		var conn models.Connection
		err := rows.Scan(&conn.ID, &conn.UserID, &conn.Username, &conn.ConnectionType, &conn.Timestamp)
		if err != nil {
			log.Printf("Failed to scan connection row: %v", err)
			continue
		}
		connections = append(connections, conn)
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(connections)
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

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(mediaItems)
}

func (s *APIServer) serveMediaFileHandler(w http.ResponseWriter, r *http.Request) {
	userId, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		http.Error(w, "could not get user ID from context", http.StatusUnauthorized)
		return
	}

	//extract file path from URL and trim prefix to get relative path
	URLfilePath := strings.TrimPrefix(r.URL.Path, "/api/v1/mediafile/")

	//construct full, safe path; prevents user from accessing files from other directory
	fullPath := filepath.Join("uploads", fmt.Sprintf("%d", userId), URLfilePath)

	http.ServeFile(w, r, fullPath)
}

func unzip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		fpath := filepath.Join(dest, f.Name)
		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		_, err = io.Copy(outFile, rc)

		outFile.Close()
		rc.Close()

		if err != nil {
			return err
		}
	}
	return nil
}
