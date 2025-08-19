package models

import (
	"time"
)

// ---Database Models------
type User struct {
	ID           int       `db:"id"`
	Email        string    `db:"email"`
	PasswordHash string    `db:"password_hash"`
	CreatedAt    time.Time `db:"created_at"`
}

type MediaItem struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	URI       string    `json:"uri"`
	Caption   string    `json:"caption"`
	TakenAt   time.Time `json:"taken_at"`
	MediaType string    `json:"media_type"`
}

// JSON Parsing Models
type InstagramPostWrapper struct {
	Media []InstagramPost `json:"media"`
}

type InstagramPost struct {
	URI               string `json:"uri"`
	Title             string `json:"title"`
	CreationTimeStamp int64  `json:"creation_timestamp"`
}

type InstagramStoryWrapper struct {
	Stories []InstagramPost `json:"ig_stories"`
}
