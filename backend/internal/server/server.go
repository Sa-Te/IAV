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
	mux.Handle("/api/v1/ad-interests", authMiddleware(http.HandlerFunc(s.getAdInterestsHandler)))
	mux.Handle("/api/v1/activity", authMiddleware(http.HandlerFunc(s.getActivityLogHandler)))
	mux.Handle("/api/v1/likes", authMiddleware(http.HandlerFunc(s.getLikesHandler)))
	mux.Handle("/api/v1/comments", authMiddleware(http.HandlerFunc(s.getCommentsHandler)))
	mux.Handle("/api/v1/saved", authMiddleware(http.HandlerFunc(s.getSavedHandler)))
	mux.Handle("/api/v1/profile", authMiddleware(http.HandlerFunc(s.getProfileHandler)))
	mux.Handle("/api/v1/security", authMiddleware(http.HandlerFunc(s.getSecurityHandler)))
	mux.Handle("/api/v1/search-history", authMiddleware(http.HandlerFunc(s.getSearchHistoryHandler)))
	mux.Handle("/api/v1/story-interactions", authMiddleware(http.HandlerFunc(s.getStoryInteractionsHandler)))
	mux.Handle("/api/v1/messages", authMiddleware(http.HandlerFunc(s.getMessagesHandler)))
	mux.Handle("/api/v1/topics", authMiddleware(http.HandlerFunc(s.getTopicsHandler)))
	mux.Handle("/api/v1/off-meta-activity", authMiddleware(http.HandlerFunc(s.getOffMetaActivityHandler)))
	mux.Handle("/api/v1/archived-posts", authMiddleware(http.HandlerFunc(s.getArchivedPostsHandler)))

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
	})
	handler := c.Handler(mux)

	log.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
