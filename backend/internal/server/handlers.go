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

				contactInfo := contactItem.StringMapData.ContactInfo.Value

				sqlStatement := `
					INSERT INTO connections (user_id, username, connection_type, timestamp, contact_info) 
					VALUES ($1, $2, $3, $4, $5) 
					ON CONFLICT (user_id, username, connection_type) 
					DO UPDATE SET contact_info = EXCLUDED.contact_info;`

				_, err := s.db.Exec(context.Background(), sqlStatement, userID, contactName, "contact", time.Now(), contactInfo)
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

		if f.Name == "connections/followers_and_following/blocked_profiles.json" {
			log.Println("Found blocked_profiles.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.BlockedUserWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode blocked_profiles.json: %v", err)
				file.Close()
				continue
			}

			file.Close()

			log.Println("-----Inserting Blocked Profiles into DB-----")
			for _, user := range wrapper.BlockedUsers {
				if len(user.StringData) > 0 {
					username := user.Title
					timestamp := time.Unix(user.StringData[0].Timestamp, 0)

					sqlStatement := `
                INSERT INTO connections (user_id, username, connection_type, timestamp) 
                VALUES ($1, $2, $3, $4) 
                ON CONFLICT (user_id, username, connection_type) 
                DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "blocked", timestamp)
					if err != nil {
						log.Printf("Failed to upsert blocked profile %s: %v\n", username, err)
					}
				}
			}
			log.Println("--- Finished Processing Blocked Profiles ---")
		}

		if f.Name == "connections/followers_and_following/close_friends.json" {
			log.Println("Found close_friends.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.CloseFriendsWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode close_friends.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			log.Println("--- Inserting Close Friends into Database ---")
			for _, item := range wrapper.CloseFriends {
				for _, stringData := range item.StringListData {
					username := stringData.Value
					timestamp := time.Unix(stringData.Timestamp, 0)

					sqlStatement := `
                INSERT INTO connections (user_id, username, connection_type, timestamp) 
                VALUES ($1, $2, $3, $4) 
                ON CONFLICT (user_id, username, connection_type) 
                DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "close_friends", timestamp)
					if err != nil {
						log.Printf("Failed to upsert close friend %s: %v\n", username, err)
					}
				}
			}
			log.Println("--- Finished Processing Close Friends ---")
		}

		if f.Name == "connections/followers_and_following/follow_requests_you've_received.json" {
			log.Println("Found follow_requests_you've_received.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.FollowRequestsReceivedWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode follow_requests_you've_received.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			log.Println("--- Inserting Received Follow Requests into Database ---")
			for _, item := range wrapper.Requests {
				for _, stringData := range item.StringListData {
					username := stringData.Value
					timestamp := time.Unix(stringData.Timestamp, 0)

					sqlStatement := `
                INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
                ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "request_received", timestamp)
					if err != nil {
						log.Printf("Failed to upsert received request from %s: %v\n", username, err)
					}
				}
			}
			log.Println("--- Finished Processing Received Follow Requests ---")
		}

		if f.Name == "connections/followers_and_following/hide_story_from.json" {
			log.Println("Found hide_story_from.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.HideStoryFromWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode hide_story_from.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			log.Println("--- Inserting Hide Story From into Database ---")
			for _, item := range wrapper.HiddenFrom {
				for _, stringData := range item.StringListData {
					username := stringData.Value
					timestamp := time.Unix(stringData.Timestamp, 0)

					sqlStatement := `
                INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
                ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "story_hidden_from", timestamp)
					if err != nil {
						log.Printf("Failed to upsert hide story from %s: %v\n", username, err)
					}
				}
			}
			log.Println("--- Finished Processing Hide Story From ---")
		}

		if f.Name == "connections/followers_and_following/following_hashtags.json" {
			log.Println("Found following_hashtags.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.FollowingHashtagsWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode following_hashtags.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			log.Println("--- Inserting Followed Hashtags into Database ---")
			for _, item := range wrapper.Hashtags {
				for _, stringData := range item.StringListData {
					hashtagName := stringData.Value
					timestamp := time.Unix(stringData.Timestamp, 0)

					sqlStatement := `
                INSERT INTO followed_hashtags (user_id, name, timestamp) VALUES ($1, $2, $3) 
                ON CONFLICT (user_id, name) DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					_, err := s.db.Exec(context.Background(), sqlStatement, userID, hashtagName, timestamp)
					if err != nil {
						log.Printf("Failed to upsert followed hashtag #%s: %v\n", hashtagName, err)
					}
				}
			}
			log.Println("--- Finished Processing Followed Hashtags ---")
		}

		if f.Name == "connections/followers_and_following/pending_follow_requests.json" {
			log.Println("Found pending_follow_requests.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.FollowRequestsSentWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode pending_follow_requests.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			for _, item := range wrapper.Requests {
				for _, stringData := range item.StringListData {
					username := stringData.Value
					timestamp := time.Unix(stringData.Timestamp, 0)

					sqlStatement := `
                INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
                ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					s.db.Exec(context.Background(), sqlStatement, userID, username, "request_sent", timestamp)
				}
			}
			log.Println("--- Finished Processing Sent Follow Requests ---")
		}

		// Note: The JSON key is "permanent_follow_requests", we'll label it for clarity.
		if f.Name == "connections/followers_and_following/recent_follow_requests.json" {
			log.Println("Found recent_follow_requests.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.PermanentFollowRequestsWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode recent_follow_requests.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			for _, item := range wrapper.Requests {
				for _, stringData := range item.StringListData {
					username := stringData.Value
					timestamp := time.Unix(stringData.Timestamp, 0)

					sqlStatement := `
                INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
                ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					s.db.Exec(context.Background(), sqlStatement, userID, username, "request_sent_permanent", timestamp)
				}
			}
			log.Println("--- Finished Processing Permanent/Recent Follow Requests ---")
		}

		if f.Name == "connections/followers_and_following/recently_unfollowed_profiles.json" {
			log.Println("Found recently_unfollowed_profiles.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.UnfollowedUsersWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode recently_unfollowed_profiles.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			for _, item := range wrapper.Unfollowed {
				for _, stringData := range item.StringListData {
					username := stringData.Value
					timestamp := time.Unix(stringData.Timestamp, 0)

					sqlStatement := `
                INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
                ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					s.db.Exec(context.Background(), sqlStatement, userID, username, "unfollowed", timestamp)
				}
			}
			log.Println("--- Finished Processing Unfollowed Users ---")
		}

		if f.Name == "connections/followers_and_following/removed_suggestions.json" {
			log.Println("Found removed_suggestions.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.DismissedSuggestionsWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode removed_suggestions.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			for _, item := range wrapper.Dismissed {
				for _, stringData := range item.StringListData {
					username := stringData.Value
					timestamp := time.Unix(stringData.Timestamp, 0)

					sqlStatement := `
                INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
                ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					s.db.Exec(context.Background(), sqlStatement, userID, username, "suggestion_removed", timestamp)
				}
			}
			log.Println("--- Finished Processing Removed Suggestions ---")
		}

		if f.Name == "connections/followers_and_following/restricted_profiles.json" {
			log.Println("Found restricted_profiles.json, starting to parse...")
			file, err := f.Open()
			if err != nil {
				continue
			}

			var wrapper models.RestrictedUsersWrapper
			if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
				log.Printf("Failed to decode restricted_profiles.json: %v", err)
				file.Close()
				continue
			}
			file.Close()

			for _, item := range wrapper.Restricted {
				for _, stringData := range item.StringListData {
					username := stringData.Value
					timestamp := time.Unix(stringData.Timestamp, 0)

					sqlStatement := `
                INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
                ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`

					s.db.Exec(context.Background(), sqlStatement, userID, username, "restricted", timestamp)
				}
			}
			log.Println("--- Finished Processing Restricted Profiles ---")
		}

	}
}

func (s *APIServer) getHashtagsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		http.Error(w, "Could not get user ID from context", http.StatusInternalServerError)
		return
	}

	sqlStatement := `SELECT id, user_id, name, timestamp FROM followed_hashtags WHERE user_id=$1 ORDER BY name ASC`
	rows, err := s.db.Query(context.Background(), sqlStatement, userID)
	if err != nil {
		http.Error(w, "Failed to get followed hashtags", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	hashtags := make([]models.FollowedHashtag, 0)
	for rows.Next() {
		var h models.FollowedHashtag
		if err := rows.Scan(&h.ID, &h.UserID, &h.Name, &h.Timestamp); err != nil {
			log.Printf("Failed to scan hashtag row: %v", err)
			continue
		}
		hashtags = append(hashtags, h)
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(hashtags)
}

func (s *APIServer) getConnectionsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		http.Error(w, "Could not get user ID from context", http.StatusInternalServerError)
		return
	}

	sqlStatement := `SELECT id, user_id, username, connection_type, timestamp, contact_info FROM connections WHERE user_id=$1`

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
		err := rows.Scan(&conn.ID, &conn.UserID, &conn.Username, &conn.ConnectionType, &conn.Timestamp, &conn.ContactInfo)
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
