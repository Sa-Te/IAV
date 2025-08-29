package server

import (
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/cors"
)

type contextKey string

const userIDKey contextKey = "userID"

// API SERVER
type APIServer struct {
	db *pgxpool.Pool
}

func NewAPIServer(db *pgxpool.Pool) *APIServer {
	return &APIServer{
		db: db,
	}
}

func (s *APIServer) Run() {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/v1/register", s.registerHandler)
	mux.HandleFunc("/api/v1/login", s.loginHandler)
	mux.Handle("/api/v1/upload", authMiddleware(http.HandlerFunc(s.uploadHandler)))
	mux.Handle("/api/v1/media", authMiddleware(http.HandlerFunc(s.getMediaItemsHandler)))
	mux.Handle("/api/v1/mediafile/", authMiddleware(http.HandlerFunc(s.serveMediaFileHandler)))
	mux.Handle("/api/v1/connections", authMiddleware(http.HandlerFunc(s.getConnectionsHandler)))
	mux.Handle("/api/v1/hashtags", authMiddleware(http.HandlerFunc(s.getHashtagsHandler)))

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
	})
	handler := c.Handler(mux)

	log.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
