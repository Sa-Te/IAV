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

type Connection struct {
	ID             int       `db:"id"`
	UserID         int       `db:"user_id"`
	Username       string    `db:"username"`
	ConnectionType string    `db:"connection_type" json:"connection_type"`
	Timestamp      time.Time `db:"timestamp"`
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

type Relationship struct {
	StringListData []StringListData `json:"string_list_data"`
}

type StringListData struct {
	Value     string `json:"value"`
	Timestamp int64  `json:"timestamp"`
}

type SyncedContactsWrapper struct {
	ContactInfo []ContactItem `json:"contacts_contact_info"`
}

type ContactItem struct {
	StringMapData ContactStringMap `json:"string_map_data"`
}

type ContactStringMap struct {
	FirstName   ValueObject `json:"First Name"`
	LastName    ValueObject `json:"Last Name"`
	ContactInfo ValueObject `json:"Contact Information"`
}

type ValueObject struct {
	Value string `json:"value"`
}
