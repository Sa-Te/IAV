package main

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/rs/cors"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID           int       `db:"id"`
	Email        string    `db:"email"`
	PasswordHash string    `db:"password_hash"`
	CreatedAt    time.Time `db:"created_at"`
}

type APIServer struct {
	db *pgx.Conn
}

type InstagramPostWrapper struct {
	Media []InstagramPost `json:"media"`
}

type InstagramPost struct {
	URI               string `json:"uri"`
	Title             string `json:"title"`
	CreationTimeStamp int64  `json:"creation_timestamp"`
}

type MediaItem struct {
	ID      int       `json:"id"`
	UserID  int       `json:"user_id"`
	URI     string    `json:"uri"`
	Caption string    `json:"caption"`
	TakenAt time.Time `json:"taken_at"`
}

func NewAPIServer(db *pgx.Conn) *APIServer {
	return &APIServer{
		db: db,
	}
}

// --- context key
type contextKey string

const userIDKey contextKey = "userID"

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
	json.NewEncoder(w).Encode(map[string]string{"message": tokenString})

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

func authMiddleware(next http.Handler) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		//get the token
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		//parse and validate
		//header should be in format "Bearer <token>"
		headerParts := strings.Split(authHeader, " ")
		if len(headerParts) != 2 || headerParts[0] != "Bearer" {
			http.Error(w, "Invalid Authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := headerParts[1]

		secretKey := []byte("complete-random-string-that-is-ver-long")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			//check signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])

			}
			return secretKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		//extract the user id
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}
		userIDFloat, ok := claims["userID"].(float64)
		if !ok {
			http.Error(w, "Invalid userID in token", http.StatusUnauthorized)
			return
		}
		userID := int(userIDFloat)

		//add id to the context
		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *APIServer) protectedHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Welcome to the protected area!"})
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
	go s.processArchive("temp-archive.zip", userID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "File uploaded, processing stage...."})
}

func (s *APIServer) processArchive(filepath string, userID int) {
	// open zip for read
	r, err := zip.OpenReader(filepath)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer r.Close()

	log.Println("--- Archive Contents ---")
	// Loop through each file in the archive.
	for _, f := range r.File {
		if f.Name == "your_instagram_activity/media/posts_1.json" {
			log.Println("Found posts_1.json, starting to parse...")

			postFile, err := f.Open()
			if err != nil {
				log.Printf("Failed to open %s from zip: %v", postFile, err)
				continue
			}
			defer postFile.Close()

			var posts []InstagramPostWrapper

			err = json.NewDecoder(postFile).Decode(&posts)
			if err != nil {
				log.Printf("Failed to decode %s: %v", postFile, err)
				continue
			}

			log.Println("-------Parsed Post Titles-------")
			for _, wrapper := range posts {
				for _, post := range wrapper.Media {
					sqlStatement := `INSERT INTO media_items (user_id, uri, caption, taken_at) VALUES ($1, $2, $3, $4)`

					// Convert the Unix timestamp to a time.Time object
					takenAt := time.Unix(post.CreationTimeStamp, 0)

					_, err := s.db.Exec(context.Background(), sqlStatement, userID, post.URI, post.Title, takenAt)
					if err != nil {
						log.Printf("Failed to insert post with URI %s: %v\n", post.URI, err)
					} else {
						log.Printf("Successfully inserted post: %s\n", post.Title)
					}

				}
			}
			log.Println("--- Finished Inserting Posts ---")
		}
	}
}

func (s *APIServer) getPostsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int64)
	if !ok {
		http.Error(w, "Could not get user ID from context", http.StatusInternalServerError)
		return
	}

	sqlStatement := `SELECT id, user_id, uri, caption, taken_at FROM media_items WHERE user_id=$1`

	rows, err := s.db.Query(context.Background(), sqlStatement, userID)
	if err != nil {
		http.Error(w, "Failed to get media items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var mediaItems []MediaItem

	for rows.Next() {
		var item MediaItem

		err := rows.Scan(&item.ID, &item.UserID, &item.URI, &item.Caption, &item.TakenAt)
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

func main() {
	connStr := "postgres://postgres:letmeinfast@localhost:5432/postgres"

	db, err := pgx.Connect(context.Background(), connStr)

	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close(context.Background())

	fmt.Println("Successfully connected to PostgreSQL!")

	//create server Instance

	server := NewAPIServer(db)
	mux := http.NewServeMux()

	mux.HandleFunc("/api/v1/register", server.registerHandler)
	mux.HandleFunc("/api/v1/login", server.loginHandler)

	// Protected route
	// We wrap our protectedHandler with the authMiddleware.
	mux.Handle("/api/v1/protected", authMiddleware(http.HandlerFunc(server.protectedHandler)))
	mux.Handle("/api/v1/upload", authMiddleware(http.HandlerFunc(server.uploadHandler)))
	mux.Handle("/api/v1/posts", authMiddleware(http.HandlerFunc(server.getPostsHandler)))

	//-- CORS SETUP --
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
	})

	handler := c.Handler(mux)

	fmt.Println("Server starting on post 8080......")

	log.Fatal(http.ListenAndServe(":8080", handler))
}
