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

type AdAdvertiser struct {
	ID             int    `db:"id" json:"id"`
	UserID         int    `db:"user_id" json:"user_id"`
	AdvertiserName string `db:"advertiser_name" json:"advertiser_name"`
}

type AdTopic struct {
	ID        int    `db:"id" json:"id"`
	UserID    int    `db:"user_id" json:"user_id"`
	TopicName string `db:"topic_name" json:"topic_name"`
}

type ActivityLog struct {
	ID           int       `json:"id"`
	UserID       int       `json:"user_id"`
	ActivityType string    `json:"activity_type"`
	Author       *string   `json:"author"`
	Timestamp    time.Time `json:"timestamp"`
	Details      *string   `json:"details"`
}

// --- New DB Models ---

type PostLike struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	CreatorUsername string    `json:"creator_username"`
	PostURL         string    `json:"post_url"`
	LikedAt         time.Time `json:"liked_at"`
}

type CommentLike struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	OwnerUsername string    `json:"owner_username"`
	PostURL       string    `json:"post_url"`
	LikedAt       time.Time `json:"liked_at"`
}

type StoryLike struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	CreatorUsername string    `json:"creator_username"`
	LikedAt         time.Time `json:"liked_at"`
}

type PostComment struct {
	ID                int       `json:"id"`
	UserID            int       `json:"user_id"`
	PostOwnerUsername string    `json:"post_owner_username"`
	CommentText       string    `json:"comment_text"`
	CommentedAt       time.Time `json:"commented_at"`
}

type ReelComment struct {
	ID                int       `json:"id"`
	UserID            int       `json:"user_id"`
	ReelOwnerUsername string    `json:"reel_owner_username"`
	CommentText       string    `json:"comment_text"`
	CommentedAt       time.Time `json:"commented_at"`
}

type SavedMedia struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	CreatorUsername string    `json:"creator_username"`
	PostURL         string    `json:"post_url"`
	SavedAt         time.Time `json:"saved_at"`
}

type SavedCollection struct {
	ID             int       `json:"id"`
	UserID         int       `json:"user_id"`
	CollectionName string    `json:"collection_name"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type SavedCollectionItem struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	CollectionName  string    `json:"collection_name"`
	ItemURL         string    `json:"item_url"`
	CreatorUsername string    `json:"creator_username"`
	AddedAt         time.Time `json:"added_at"`
}

type UserProfile struct {
	ID              int     `json:"id"`
	UserID          int     `json:"user_id"`
	Email           string  `json:"email"`
	PhoneNumber     string  `json:"phone_number"`
	Username        string  `json:"username"`
	Bio             string  `json:"bio"`
	Gender          string  `json:"gender"`
	DateOfBirth     *string `json:"date_of_birth"`
	ProfilePhotoURI string  `json:"profile_photo_uri"`
}

type ProfileChange struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	FieldChanged  string    `json:"field_changed"`
	PreviousValue string    `json:"previous_value"`
	NewValue      string    `json:"new_value"`
	ChangedAt     time.Time `json:"changed_at"`
}

type ProfilePhoto struct {
	ID       int       `json:"id"`
	UserID   int       `json:"user_id"`
	PhotoURI string    `json:"photo_uri"`
	SetAt    time.Time `json:"set_at"`
}

type ArchivedPost struct {
	ID      int       `json:"id"`
	UserID  int       `json:"user_id"`
	URI     string    `json:"uri"`
	Caption string    `json:"caption"`
	TakenAt time.Time `json:"taken_at"`
}

type LoginHistory struct {
	ID           int       `json:"id"`
	UserID       int       `json:"user_id"`
	IPAddress    string    `json:"ip_address"`
	UserAgent    string    `json:"user_agent"`
	LanguageCode string    `json:"language_code"`
	LoggedInAt   time.Time `json:"logged_in_at"`
}

type LogoutHistory struct {
	ID          int       `json:"id"`
	UserID      int       `json:"user_id"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"`
	LoggedOutAt time.Time `json:"logged_out_at"`
}

type PasswordChange struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	ChangedAt time.Time `json:"changed_at"`
}

type SignupInfo struct {
	ID               int        `json:"id"`
	UserID           int        `json:"user_id"`
	UsernameAtSignup string     `json:"username_at_signup"`
	EmailAtSignup    string     `json:"email_at_signup"`
	SignupIP         string     `json:"signup_ip"`
	DeviceModel      string     `json:"device_model"`
	SignedUpAt       *time.Time `json:"signed_up_at"`
}

type PrivacyChange struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	PrivacyStatus string    `json:"privacy_status"`
	ChangedAt     time.Time `json:"changed_at"`
}

type AccountStatusEntry struct {
	ID             int       `json:"id"`
	UserID         int       `json:"user_id"`
	ActivationType string    `json:"activation_type"`
	Reason         string    `json:"reason"`
	ChangedAt      time.Time `json:"changed_at"`
}

type StoryPoll struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	CreatorUsername string    `json:"creator_username"`
	PollAnswer      string    `json:"poll_answer"`
	AnsweredAt      time.Time `json:"answered_at"`
}

type StoryQuiz struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	CreatorUsername string    `json:"creator_username"`
	QuizAnswer      string    `json:"quiz_answer"`
	AnsweredAt      time.Time `json:"answered_at"`
}

type StoryQuestion struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	CreatorUsername string    `json:"creator_username"`
	RespondedAt     time.Time `json:"responded_at"`
}

type StoryEmojiSlider struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	CreatorUsername string    `json:"creator_username"`
	SliderValue     float64   `json:"slider_value"`
	RespondedAt     time.Time `json:"responded_at"`
}

type StoryReaction struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	CreatorUsername string    `json:"creator_username"`
	RespondedAt     time.Time `json:"responded_at"`
}

type SearchHistoryEntry struct {
	ID          int       `json:"id"`
	UserID      int       `json:"user_id"`
	SearchQuery string    `json:"search_query"`
	SearchType  string    `json:"search_type"`
	SearchedAt  time.Time `json:"searched_at"`
}

type MessageConversation struct {
	ID             int    `json:"id"`
	UserID         int    `json:"user_id"`
	ConversationID string `json:"conversation_id"`
	Participants   string `json:"participants"`
	ThreadType     string `json:"thread_type"`
}

type Message struct {
	ID             int       `json:"id"`
	UserID         int       `json:"user_id"`
	ConversationID string    `json:"conversation_id"`
	SenderName     string    `json:"sender_name"`
	Content        string    `json:"content"`
	SentAt         time.Time `json:"sent_at"`
}

type AIInterest struct {
	ID                  int        `json:"id"`
	UserID              int        `json:"user_id"`
	InterestDescription string     `json:"interest_description"`
	DetectedAt          *time.Time `json:"detected_at"`
}

type UserTopic struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	TopicName string `json:"topic_name"`
}

type InferredLocation struct {
	ID       int    `json:"id"`
	UserID   int    `json:"user_id"`
	CityName string `json:"city_name"`
}

type OffMetaActivity struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	AppName   string    `json:"app_name"`
	EventType string    `json:"event_type"`
	EventID   int64     `json:"event_id"`
	EventAt   time.Time `json:"event_at"`
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
	Href      string `json:"href"`
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

// For advertisers_using_your_activity_or_information.json
type AdvertiserWrapper struct {
	CustomAudiences []struct {
		AdvertiserName string `json:"advertiser_name"`
	} `json:"ig_custom_audiences_all_types"`
}

// For other_categories_used_to_reach_you.json
type TopicWrapper struct {
	LabelValues []struct {
		Label string `json:"label"`
		Vec   []struct {
			Value string `json:"value"`
		} `json:"vec"`
	} `json:"label_values"`
}

type ActivityImpression struct {
	StringMapData struct {
		Author    ValueObject `json:"Author"`
		Username  ValueObject `json:"Username"` // For suggested profiles
		Timestamp struct {
			Timestamp int64 `json:"timestamp"`
		} `json:"Time"`
	} `json:"string_map_data"`
}

type AdsViewedWrapper struct {
	Impressions []ActivityImpression `json:"impressions_history_ads_seen"`
}

// Wrapper for posts_viewed.json
type PostsViewedWrapper struct {
	Impressions []ActivityImpression `json:"impressions_history_posts_seen"`
}

// Wrapper for videos_watched.json
type VideosWatchedWrapper struct {
	Impressions []ActivityImpression `json:"impressions_history_videos_watched"`
}

// Wrapper for suggested_profiles_viewed.json
type SuggestedProfilesViewedWrapper struct {
	Impressions []ActivityImpression `json:"impressions_history_chaining_seen"`
}

// Special structures for the oddly formatted posts_you're_not_interested_in.json
type NotInterestedItem struct {
	StringListData []NotInterestedStringData `json:"string_list_data"`
}

type NotInterestedStringData struct {
	Href      string `json:"href"`
	Value     string `json:"value"`
	Timestamp int64  `json:"timestamp"`
}

type PostsNotInterestedWrapper struct {
	Impressions []NotInterestedItem `json:"impressions_history_posts_not_interested"`
}

// --- New JSON Parsing Models ---

type LikedPostsWrapper struct {
	Likes []struct {
		Title          string           `json:"title"`
		StringListData []StringListData `json:"string_list_data"`
	} `json:"likes_media_likes"`
}

type LikedCommentsWrapper struct {
	Likes []struct {
		Title          string           `json:"title"`
		StringListData []StringListData `json:"string_list_data"`
	} `json:"likes_comment_likes"`
}

type StoryLikesWrapper struct {
	Likes []struct {
		Title          string           `json:"title"`
		StringListData []StringListData `json:"string_list_data"`
	} `json:"story_activities_story_likes"`
}

// PostCommentEntry is used for the root-array format of post_comments_1.json
type PostCommentEntry struct {
	StringMapData struct {
		Comment    ValueObject `json:"Comment"`
		MediaOwner ValueObject `json:"Media Owner"`
		Time       struct {
			Timestamp int64 `json:"timestamp"`
		} `json:"Time"`
	} `json:"string_map_data"`
}

type ReelCommentsWrapper struct {
	Comments []struct {
		StringMapData struct {
			Comment    ValueObject `json:"Comment"`
			MediaOwner ValueObject `json:"Media Owner"`
			Time       struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Time"`
		} `json:"string_map_data"`
	} `json:"comments_reels_comments"`
}

type SavedMediaWrapper struct {
	Media []struct {
		Title         string `json:"title"`
		StringMapData struct {
			SavedOn struct {
				Href      string `json:"href"`
				Timestamp int64  `json:"timestamp"`
			} `json:"Saved on"`
		} `json:"string_map_data"`
	} `json:"saved_saved_media"`
}

type SavedCollectionsWrapper struct {
	Collections []struct {
		Title         string `json:"title"`
		StringMapData struct {
			Name struct {
				Href  string `json:"href"`
				Value string `json:"value"`
			} `json:"Name"`
			CreationTime struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Creation Time"`
			UpdateTime struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Update Time"`
			AddedTime struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Added Time"`
		} `json:"string_map_data"`
	} `json:"saved_saved_collections"`
}

type PersonalInfoWrapper struct {
	ProfileUser []struct {
		MediaMapData struct {
			ProfilePhoto struct {
				URI               string `json:"uri"`
				CreationTimestamp int64  `json:"creation_timestamp"`
			} `json:"Profile Photo"`
		} `json:"media_map_data"`
		StringMapData struct {
			Email       ValueObject `json:"Email"`
			PhoneNumber ValueObject `json:"Phone Number"`
			Username    ValueObject `json:"Username"`
			Bio         ValueObject `json:"Bio"`
			Gender      ValueObject `json:"Gender"`
			DateOfBirth ValueObject `json:"Date of birth"`
		} `json:"string_map_data"`
	} `json:"profile_user"`
}

type ProfileChangesWrapper struct {
	Changes []struct {
		StringMapData struct {
			Changed       ValueObject `json:"Changed"`
			PreviousValue ValueObject `json:"Previous Value"`
			NewValue      ValueObject `json:"New Value"`
			ChangeDate    struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Change Date"`
		} `json:"string_map_data"`
	} `json:"profile_profile_change"`
}

type ProfilePhotosWrapper struct {
	Photos []struct {
		URI               string `json:"uri"`
		CreationTimestamp int64  `json:"creation_timestamp"`
	} `json:"ig_profile_picture"`
}

type ArchivedPostsWrapper struct {
	Posts []struct {
		Media []struct {
			URI               string `json:"uri"`
			Title             string `json:"title"`
			CreationTimestamp int64  `json:"creation_timestamp"`
		} `json:"media"`
	} `json:"ig_archived_post_media"`
}

type LoginHistoryWrapper struct {
	History []struct {
		StringMapData struct {
			IPAddress    ValueObject `json:"IP Address"`
			UserAgent    ValueObject `json:"User Agent"`
			LanguageCode ValueObject `json:"Language Code"`
			Time         struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Time"`
		} `json:"string_map_data"`
	} `json:"account_history_login_history"`
}

type LogoutHistoryWrapper struct {
	History []struct {
		StringMapData struct {
			IPAddress ValueObject `json:"IP Address"`
			UserAgent ValueObject `json:"User Agent"`
			Time      struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Time"`
		} `json:"string_map_data"`
	} `json:"account_history_logout_history"`
}

type PasswordChangeWrapper struct {
	History []struct {
		StringMapData struct {
			Time struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Time"`
		} `json:"string_map_data"`
	} `json:"account_history_password_change_history"`
}

type SignupInfoWrapper struct {
	Info []struct {
		StringMapData struct {
			Username    ValueObject `json:"Username"`
			IPAddress   ValueObject `json:"IP Address"`
			Email       ValueObject `json:"Email"`
			PhoneNumber ValueObject `json:"Phone Number"`
			Device      ValueObject `json:"Device"`
			Time        struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Time"`
		} `json:"string_map_data"`
	} `json:"account_history_registration_info"`
}

type PrivacyChangesWrapper struct {
	History []struct {
		Title         string `json:"title"`
		StringMapData struct {
			Time struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Time"`
		} `json:"string_map_data"`
	} `json:"account_history_account_privacy_history"`
}

type AccountStatusWrapper struct {
	History []struct {
		StringMapData struct {
			ActivationType ValueObject `json:"Activation Type"`
			Reason         ValueObject `json:"Inactivation Reason"`
			Time           struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Time"`
		} `json:"string_map_data"`
	} `json:"account_history_account_active_status_changes"`
}

type StoryPollsWrapper struct {
	Polls []struct {
		Title          string           `json:"title"`
		StringListData []StringListData `json:"string_list_data"`
	} `json:"story_activities_polls"`
}

type StoryQuizzesWrapper struct {
	Quizzes []struct {
		Title          string           `json:"title"`
		StringListData []StringListData `json:"string_list_data"`
	} `json:"story_activities_quizzes"`
}

type StoryQuestionsWrapper struct {
	Questions []struct {
		Title          string           `json:"title"`
		StringListData []StringListData `json:"string_list_data"`
	} `json:"story_activities_questions"`
}

type StoryEmojiSlidersWrapper struct {
	Sliders []struct {
		Title          string           `json:"title"`
		StringListData []StringListData `json:"string_list_data"`
	} `json:"story_activities_emoji_sliders"`
}

type StoryReactionsWrapper struct {
	Reactions []struct {
		Title          string           `json:"title"`
		StringListData []StringListData `json:"string_list_data"`
	} `json:"story_activities_reaction_sticker_reactions"`
}

type ProfileSearchesWrapper struct {
	Searches []struct {
		StringMapData struct {
			Search ValueObject `json:"Search"`
			Time   struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Time"`
		} `json:"string_map_data"`
	} `json:"searches_user"`
}

type KeywordSearchesWrapper struct {
	Searches []struct {
		StringMapData struct {
			Search ValueObject `json:"Search"`
			Time   struct {
				Timestamp int64 `json:"timestamp"`
			} `json:"Time"`
		} `json:"string_map_data"`
	} `json:"searches_keyword"`
}

type MessageFile struct {
	Participants []struct {
		Name string `json:"name"`
	} `json:"participants"`
	Messages []struct {
		SenderName  string `json:"sender_name"`
		TimestampMs int64  `json:"timestamp_ms"`
		Content     string `json:"content"`
	} `json:"messages"`
	Title      string `json:"title"`
	ThreadType string `json:"thread_type"`
}

// AIInterestEntry is the element type for the root-array format of interest_categories.json
type AIInterestEntry struct {
	Timestamp   int64 `json:"timestamp"`
	LabelValues []struct {
		Label          string `json:"label"`
		Value          string `json:"value,omitempty"`
		TimestampValue int64  `json:"timestamp_value,omitempty"`
	} `json:"label_values"`
}

type UserTopicsWrapper struct {
	Topics []struct {
		StringMapData struct {
			Name ValueObject `json:"Name"`
		} `json:"string_map_data"`
	} `json:"topics_your_topics"`
}

type InferredLocationWrapper struct {
	Location []struct {
		StringMapData struct {
			CityName ValueObject `json:"City Name"`
		} `json:"string_map_data"`
	} `json:"inferred_data_primary_location"`
}

type LocationsOfInterestWrapper struct {
	LabelValues []struct {
		Label string `json:"label"`
		Vec   []struct {
			Value string `json:"value"`
		} `json:"vec,omitempty"`
	} `json:"label_values"`
}

type OffMetaActivityWrapper struct {
	Activity []struct {
		Name   string `json:"name"`
		Events []struct {
			ID        int64  `json:"id"`
			Type      string `json:"type"`
			Timestamp int64  `json:"timestamp"`
		} `json:"events"`
	} `json:"apps_and_websites_off_meta_activity"`
}
