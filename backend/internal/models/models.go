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
	ContactInfo    *string   `db:"contact_info" json:"contact_info,omitempty"`
}

type FollowedHashtag struct {
	ID        int       `db:"id" json:"id"`
	UserID    int       `db:"user_id" json:"user_id"`
	Name      string    `db:"name" json:"name"`
	Timestamp time.Time `db:"timestamp" json:"timestamp"`
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

type BlockedUserWrapper struct {
	BlockedUsers []BlockedUser `json:"relationships_blocked_users"`
}

type BlockedUser struct {
	Title      string           `json:"title"`
	StringData []StringListData `json:"string_list_data"`
}

type CloseFriendsWrapper struct {
	CloseFriends []Relationship `json:"relationships_close_friends"`
}

type FollowRequestsReceivedWrapper struct {
	Requests []Relationship `json:"relationships_follow_requests_received"`
}

type FollowingHashtagsWrapper struct {
	Hashtags []Relationship `json:"relationships_following_hashtags"`
}

type HideStoryFromWrapper struct {
	HiddenFrom []Relationship `json:"relationships_hide_stories_from"`
}

type FollowRequestsSentWrapper struct {
	Requests []Relationship `json:"relationships_follow_requests_sent"`
}

type PermanentFollowRequestsWrapper struct {
	Requests []Relationship `json:"relationships_permanent_follow_requests"`
}

type UnfollowedUsersWrapper struct {
	Unfollowed []Relationship `json:"relationships_unfollowed_users"`
}

type DismissedSuggestionsWrapper struct {
	Dismissed []Relationship `json:"relationships_dismissed_suggested_users"`
}

type RestrictedUsersWrapper struct {
	Restricted []Relationship `json:"relationships_restricted_users"`
}
