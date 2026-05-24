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

// AdInterestsResponse defines the structure for the ad interests endpoint.
type AdInterestsResponse struct {
	Advertisers []string `json:"advertisers"`
	Topics      []string `json:"topics"`
}

// FileProcessor defines the signature for any function that can process a specific file from the Instagram archive.
type FileProcessor func(s *APIServer, path string, userID int) error

// processorMap maps a filename suffix to the appropriate processor function.
// This is the core of our refactoring. To support a new file, you just add an entry here.
// No more giant `if/else if` chains.
var processorMap = map[string]FileProcessor{
	"posts_1.json":                                        (*APIServer).processPosts,
	"stories.json":                                        (*APIServer).processStories,
	"synced_contacts.json":                                (*APIServer).processSyncedContacts,
	"followers_1.json":                                    (*APIServer).processFollowers,
	"following.json":                                      (*APIServer).processFollowing,
	"blocked_profiles.json":                               (*APIServer).processBlockedProfiles,
	"close_friends.json":                                  (*APIServer).processCloseFriends,
	"follow_requests_you've_received.json":                (*APIServer).processFollowRequestsReceived,
	"hide_story_from.json":                                (*APIServer).processHideStoryFrom,
	"following_hashtags.json":                             (*APIServer).processFollowingHashtags,
	"pending_follow_requests.json":                        (*APIServer).processPendingFollowRequests,
	"recent_follow_requests.json":                         (*APIServer).processRecentFollowRequests,
	"recently_unfollowed_profiles.json":                   (*APIServer).processRecentlyUnfollowed,
	"removed_suggestions.json":                            (*APIServer).processRemovedSuggestions,
	"restricted_profiles.json":                            (*APIServer).processRestrictedProfiles,
	"advertisers_using_your_activity_or_information.json": (*APIServer).processAdvertisers,
	"other_categories_used_to_reach_you.json":             (*APIServer).processAdTopics,

	// activity processors
	"ads_viewed.json":                     (*APIServer).processAdsViewed,
	"posts_viewed.json":                   (*APIServer).processPostsViewed,
	"videos_watched.json":                 (*APIServer).processVideosWatched,
	"suggested_profiles_viewed.json":      (*APIServer).processSuggestedProfilesViewed,
	"posts_you're_not_interested_in.json": (*APIServer).processPostsNotInterested,

	// likes
	"liked_posts.json":    (*APIServer).processLikedPosts,
	"liked_comments.json": (*APIServer).processLikedComments,
	"story_likes.json":    (*APIServer).processStoryLikes,

	// comments
	"post_comments_1.json": (*APIServer).processPostComments,
	"reels_comments.json":  (*APIServer).processReelComments,

	// saved
	"saved_posts.json":        (*APIServer).processSavedPosts,
	"saved_collections.json":  (*APIServer).processSavedCollections,

	// profile
	"personal_information.json": (*APIServer).processPersonalInfo,
	"profile_changes.json":      (*APIServer).processProfileChanges,
	"profile_photos.json":       (*APIServer).processProfilePhotos,
	"archived_posts.json":       (*APIServer).processArchivedPosts,

	// security
	"login_activity.json":           (*APIServer).processLoginActivity,
	"logout_activity.json":          (*APIServer).processLogoutActivity,
	"password_change_activity.json": (*APIServer).processPasswordChanges,
	"signup_details.json":           (*APIServer).processSignupInfo,
	"profile_privacy_changes.json":  (*APIServer).processPrivacyChanges,
	"profile_status_changes.json":   (*APIServer).processAccountStatus,

	// story interactions
	"polls.json":                              (*APIServer).processStoryPolls,
	"quizzes.json":                            (*APIServer).processStoryQuizzes,
	"questions.json":                          (*APIServer).processStoryQuestions,
	"emoji_sliders.json":                      (*APIServer).processEmojiSliders,
	"story_reaction_sticker_reactions.json":   (*APIServer).processStoryReactions,

	// search history
	"profile_searches.json":        (*APIServer).processProfileSearches,
	"word_or_phrase_searches.json": (*APIServer).processKeywordSearches,

	// topics / location
	"interest_categories.json":    (*APIServer).processAIInterests,
	"recommended_topics.json":     (*APIServer).processUserTopics,
	"profile_based_in.json":       (*APIServer).processInferredLocation,
	"locations_of_interest.json":  (*APIServer).processLocationsOfInterest,

	// off-meta
	"your_activity_off_meta_technologies.json": (*APIServer).processOffMetaActivity,
}

// processArchive is now a simple dispatcher. Its only responsibility is to walk the directory
// and delegate the actual file processing to the correct function from the processorMap.
func (s *APIServer) processArchive(rootPath string, userID int) {
	log.Println("----Starting to process unzipped archive at:", rootPath)

	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		// Route message files by path pattern — they share the name message_1.json
		// across many conversation directories so suffix matching alone isn't enough.
		filename := filepath.Base(path)
		if strings.HasPrefix(filename, "message_") && strings.HasSuffix(filename, ".json") &&
			(strings.Contains(path, "/messages/inbox/") || strings.Contains(path, "/messages/message_requests/")) {
			if err := s.processMessageFile(path, userID); err != nil {
				log.Printf("ERROR processing message file %s: %v", path, err)
			}
			return nil
		}

		// Iterate over our map of processors.
		for suffix, processor := range processorMap {
			if strings.HasSuffix(path, suffix) {
				log.Printf("Found '%s', dispatching to its processor.", suffix)
				if err := processor(s, path, userID); err != nil {
					log.Printf("ERROR processing file %s: %v", path, err)
				}
				return nil
			}
		}
		return nil
	})

	if err != nil {
		log.Printf("Error walking the path %q: %v\n", rootPath, err)
	}

	log.Println("-----Finished processing archive")
}

// --- Individual File Processors ---
// Each function below has a single responsibility: to parse one specific JSON file
// and insert its data into the database. They all implement the `FileProcessor` type.

func (s *APIServer) processPosts(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open posts file from disk: %w", err)
	}
	defer file.Close()

	transformer := charmap.ISO8859_1.NewDecoder()
	transformReader := transform.NewReader(file, transformer)

	var postWrappers []models.InstagramPostWrapper
	if err := json.NewDecoder(transformReader).Decode(&postWrappers); err != nil {
		return fmt.Errorf("failed to decode posts_1.json: %w", err)
	}

	log.Println("--- Inserting/Updating Posts in Database ---")
	for _, wrapper := range postWrappers {
		for _, post := range wrapper.Media {
			sqlStatement := `INSERT INTO media_items (user_id, uri, caption, taken_at, media_type) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, uri) DO NOTHING;`
			takenAt := time.Unix(post.CreationTimeStamp, 0)
			_, err := s.db.Exec(context.Background(), sqlStatement, userID, post.URI, post.Title, takenAt, "post")
			if err != nil {
				log.Printf("Failed to insert post with URI %s: %v\n", post.URI, err)
			}
		}
	}
	log.Println("--- Finished Processing Posts ---")
	return nil
}

func (s *APIServer) processStories(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open stories file from disk: %w", err)
	}
	defer file.Close()

	transformer := charmap.ISO8859_1.NewDecoder()
	transformReader := transform.NewReader(file, transformer)

	var storyWrapper models.InstagramStoryWrapper
	if err := json.NewDecoder(transformReader).Decode(&storyWrapper); err != nil {
		return fmt.Errorf("failed to decode stories.json: %w", err)
	}

	log.Println("--- Inserting Stories into Database ---")
	for _, story := range storyWrapper.Stories {
		sqlStatement := `INSERT INTO media_items (user_id, uri, caption, taken_at, media_type) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, uri) DO NOTHING;`
		takenAt := time.Unix(story.CreationTimeStamp, 0)
		_, err := s.db.Exec(context.Background(), sqlStatement, userID, story.URI, story.Title, takenAt, "story")
		if err != nil {
			log.Printf("Failed to insert story with URI %s: %v\n", story.URI, err)
		}
	}
	log.Println("--- Finished Inserting Stories ---")
	return nil
}

func (s *APIServer) processSyncedContacts(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open synced_contacts.json: %w", err)
	}
	defer file.Close()

	var contactsWrapper models.SyncedContactsWrapper
	if err := json.NewDecoder(file).Decode(&contactsWrapper); err != nil {
		return fmt.Errorf("failed to decode synced_contacts.json: %w", err)
	}

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
	return nil
}

func (s *APIServer) processFollowers(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open followers_1.json: %w", err)
	}
	defer file.Close()

	var followers []models.Relationship
	if err := json.NewDecoder(file).Decode(&followers); err != nil {
		return fmt.Errorf("failed to decode followers_1.json: %w", err)
	}

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
	return nil
}

func (s *APIServer) processFollowing(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open following.json: %w", err)
	}
	defer file.Close()

	var followingWrapper map[string][]models.Relationship
	if err := json.NewDecoder(file).Decode(&followingWrapper); err != nil {
		return fmt.Errorf("failed to decode following.json: %w", err)
	}

	var following []models.Relationship
	for _, v := range followingWrapper { // This logic extracts the list from the map
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
	return nil
}

func (s *APIServer) processBlockedProfiles(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open blocked_profiles.json: %w", err)
	}
	defer file.Close()

	var wrapper models.BlockedUserWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode blocked_profiles.json: %w", err)
	}

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
	return nil
}

func (s *APIServer) processCloseFriends(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open close_friends.json: %w", err)
	}
	defer file.Close()

	var wrapper models.CloseFriendsWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode close_friends.json: %w", err)
	}

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
			_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "close_friend", timestamp)
			if err != nil {
				log.Printf("Failed to upsert close friend %s: %v\n", username, err)
			}
		}
	}
	log.Println("--- Finished Processing Close Friends ---")
	return nil
}

func (s *APIServer) processFollowRequestsReceived(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open follow_requests_you've_received.json: %w", err)
	}
	defer file.Close()

	var wrapper models.FollowRequestsReceivedWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode follow_requests_you've_received.json: %w", err)
	}

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
	return nil
}

func (s *APIServer) processHideStoryFrom(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open hide_story_from.json: %w", err)
	}
	defer file.Close()

	var wrapper models.HideStoryFromWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode hide_story_from.json: %w", err)
	}

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
	return nil
}

func (s *APIServer) processFollowingHashtags(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open following_hashtags.json: %w", err)
	}
	defer file.Close()

	var wrapper models.FollowingHashtagsWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode following_hashtags.json: %w", err)
	}

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
	return nil
}

func (s *APIServer) processPendingFollowRequests(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open pending_follow_requests.json: %w", err)
	}
	defer file.Close()

	var wrapper models.FollowRequestsSentWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode pending_follow_requests.json: %w", err)
	}

	log.Println("--- Processing Sent Follow Requests ---")
	for _, item := range wrapper.Requests {
		for _, stringData := range item.StringListData {
			username := stringData.Value
			timestamp := time.Unix(stringData.Timestamp, 0)
			sqlStatement := `
				INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
				ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`
			_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "request_sent", timestamp)
			if err != nil {
				log.Printf("failed to upsert sent request to %s: %v\n", username, err)
			}
		}
	}
	log.Println("--- Finished Processing Sent Follow Requests ---")
	return nil
}

func (s *APIServer) processRecentFollowRequests(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open recent_follow_requests.json: %w", err)
	}
	defer file.Close()

	var wrapper models.PermanentFollowRequestsWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode recent_follow_requests.json: %w", err)
	}

	log.Println("--- Processing Permanent/Recent Follow Requests ---")
	for _, item := range wrapper.Requests {
		for _, stringData := range item.StringListData {
			username := stringData.Value
			timestamp := time.Unix(stringData.Timestamp, 0)
			sqlStatement := `
				INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
				ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`
			_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "request_sent_permanent", timestamp)
			if err != nil {
				log.Printf("failed to upsert permanent sent request to %s: %v\n", username, err)
			}
		}
	}
	log.Println("--- Finished Processing Permanent/Recent Follow Requests ---")
	return nil
}

func (s *APIServer) processRecentlyUnfollowed(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open recently_unfollowed_profiles.json: %w", err)
	}
	defer file.Close()

	var wrapper models.UnfollowedUsersWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode recently_unfollowed_profiles.json: %w", err)
	}

	log.Println("--- Processing Unfollowed Users ---")
	for _, item := range wrapper.Unfollowed {
		for _, stringData := range item.StringListData {
			username := stringData.Value
			timestamp := time.Unix(stringData.Timestamp, 0)
			sqlStatement := `
				INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
				ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`
			_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "unfollowed", timestamp)
			if err != nil {
				log.Printf("failed to upsert unfollowed user %s: %v\n", username, err)
			}
		}
	}
	log.Println("--- Finished Processing Unfollowed Users ---")
	return nil
}

func (s *APIServer) processRemovedSuggestions(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open removed_suggestions.json: %w", err)
	}
	defer file.Close()

	var wrapper models.DismissedSuggestionsWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode removed_suggestions.json: %w", err)
	}

	log.Println("--- Processing Removed Suggestions ---")
	for _, item := range wrapper.Dismissed {
		for _, stringData := range item.StringListData {
			username := stringData.Value
			timestamp := time.Unix(stringData.Timestamp, 0)
			sqlStatement := `
				INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
				ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`
			_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "suggestion_removed", timestamp)
			if err != nil {
				log.Printf("failed to upsert removed suggestion %s: %v\n", username, err)
			}
		}
	}
	log.Println("--- Finished Processing Removed Suggestions ---")
	return nil
}

func (s *APIServer) processRestrictedProfiles(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open restricted_profiles.json: %w", err)
	}
	defer file.Close()

	var wrapper models.RestrictedUsersWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode restricted_profiles.json: %w", err)
	}

	log.Println("--- Processing Restricted Profiles ---")
	for _, item := range wrapper.Restricted {
		for _, stringData := range item.StringListData {
			username := stringData.Value
			timestamp := time.Unix(stringData.Timestamp, 0)
			sqlStatement := `
				INSERT INTO connections (user_id, username, connection_type, timestamp) VALUES ($1, $2, $3, $4) 
				ON CONFLICT (user_id, username, connection_type) DO UPDATE SET timestamp = EXCLUDED.timestamp;`
			_, err := s.db.Exec(context.Background(), sqlStatement, userID, username, "restricted", timestamp)
			if err != nil {
				log.Printf("failed to upsert restricted user %s: %v\n", username, err)
			}
		}
	}
	log.Println("--- Finished Processing Restricted Profiles ---")
	return nil
}

func (s *APIServer) processAdvertisers(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open advertisers file from disk: %w", err)
	}
	defer file.Close()

	var wrapper models.AdvertiserWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode advertisers... file: %w", err)
	}

	log.Println("--- Inserting Ad Advertisers into Database ---")
	for _, ad := range wrapper.CustomAudiences {
		sqlStatement := `INSERT INTO ad_advertisers (user_id, advertiser_name) VALUES ($1, $2) ON CONFLICT (user_id, advertiser_name) DO NOTHING;`
		_, err := s.db.Exec(context.Background(), sqlStatement, userID, ad.AdvertiserName)
		if err != nil {
			log.Printf("Failed to insert ad advertiser %s: %v\n", ad.AdvertiserName, err)
		}
	}
	log.Println("--- Finished Processing Ad Advertisers ---")
	return nil
}

func (s *APIServer) processAdTopics(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open ad topics file from disk: %w", err)
	}
	defer file.Close()

	var wrapper models.TopicWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode other_categories... file: %w", err)
	}

	log.Println("--- Inserting Ad Topics into Database ---")
	for _, label := range wrapper.LabelValues {
		if label.Label == "Name" { // Ensure we're only getting the topics under the "Name" label
			for _, topic := range label.Vec {
				sqlStatement := `INSERT INTO ad_topics (user_id, topic_name) VALUES ($1, $2) ON CONFLICT (user_id, topic_name) DO NOTHING;`
				_, err := s.db.Exec(context.Background(), sqlStatement, userID, topic.Value)
				if err != nil {
					log.Printf("Failed to insert ad topic %s: %v\n", topic.Value, err)
				}
			}
		}
	}
	log.Println("--- Finished Processing Ad Topics ---")
	return nil
}

// helper func
func writeJSONError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

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
		writeJSONError(w, http.StatusUnauthorized, "Invalid Email or Password")
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(reqBody.Password))

	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "Invalid Email or Password")
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

	file, _, err := r.FormFile("archiveFile")
	if err != nil {
		http.Error(w, "Invalid file key. Expected 'archiveFile'.", http.StatusBadRequest)
		return
	}
	defer file.Close()

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

	_, err = io.Copy(dst, file)
	if err != nil {
		dst.Close() // close before removing
		os.Remove(tempZipPath)
		http.Error(w, "Failed to save the file", http.StatusInternalServerError)
		return
	}
	dst.Close()

	//unzip the archive into user's dir
	if err := unzip(tempZipPath, userUploadDir); err != nil {
		log.Printf("Failed to unzip archive: %v", err)
		http.Error(w, "Failed to process archive.", http.StatusInternalServerError)
		os.Remove(tempZipPath)
		return
	}

	// Defer removal of temp zip after successful unzip
	defer os.Remove(tempZipPath)

	// Call our new, clean processor
	s.processArchive(userUploadDir, userID)

	//send back success message
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "File uploaded, processed successfully."})

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

		// Prevent ZipSlip vulnerability
		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("%s: illegal file path", fpath)
		}

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
			outFile.Close()
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

func (s *APIServer) getAdInterestsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusInternalServerError, "Could not determine user.")
		return
	}

	response := AdInterestsResponse{
		Advertisers: make([]string, 0),
		Topics:      make([]string, 0),
	}
	var err error

	// Fetch Advertisers
	advRows, err := s.db.Query(context.Background(), `SELECT advertiser_name FROM ad_advertisers WHERE user_id=$1`, userID)
	if err != nil {
		log.Printf("ERROR fetching advertisers for user %d: %v", userID, err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to retrieve ad interests.")
		return
	}
	defer advRows.Close()

	for advRows.Next() {
		var name string
		if err := advRows.Scan(&name); err == nil {
			response.Advertisers = append(response.Advertisers, name)
		}
	}

	// Fetch Topics
	topicRows, err := s.db.Query(context.Background(), `SELECT topic_name FROM ad_topics WHERE user_id=$1`, userID)
	if err != nil {
		log.Printf("ERROR fetching topics for user %d: %v", userID, err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to retrieve ad interests.")
		return
	}
	defer topicRows.Close()

	for topicRows.Next() {
		var name string
		if err := topicRows.Scan(&name); err == nil {
			response.Topics = append(response.Topics, name)
		}
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (s *APIServer) processAdsViewed(path string, userID int) error {
	var wrapper models.AdsViewedWrapper
	if err := decodeActivityFile(path, &wrapper); err != nil {
		return err
	}
	log.Println("--- Inserting Ads Viewed into Database ---")
	return s.insertActivityImpressions(userID, "ad_viewed", wrapper.Impressions)
}

func (s *APIServer) processPostsViewed(path string, userID int) error {
	var wrapper models.PostsViewedWrapper
	if err := decodeActivityFile(path, &wrapper); err != nil {
		return err
	}
	log.Println("--- Inserting Posts Viewed into Database ---")
	return s.insertActivityImpressions(userID, "post_viewed", wrapper.Impressions)
}

func (s *APIServer) processVideosWatched(path string, userID int) error {
	var wrapper models.VideosWatchedWrapper
	if err := decodeActivityFile(path, &wrapper); err != nil {
		return err
	}
	log.Println("--- Inserting Videos Watched into Database ---")
	return s.insertActivityImpressions(userID, "video_watched", wrapper.Impressions)
}

func (s *APIServer) processSuggestedProfilesViewed(path string, userID int) error {
	var wrapper models.SuggestedProfilesViewedWrapper
	if err := decodeActivityFile(path, &wrapper); err != nil {
		return err
	}
	log.Println("--- Inserting Suggested Profiles Viewed into Database ---")
	return s.insertActivityImpressions(userID, "suggested_profile_viewed", wrapper.Impressions)
}

func (s *APIServer) processPostsNotInterested(path string, userID int) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open file %s: %w", path, err)
	}
	defer file.Close()

	var wrapper models.PostsNotInterestedWrapper
	if err := json.NewDecoder(file).Decode(&wrapper); err != nil {
		return fmt.Errorf("failed to decode %s: %w", path, err)
	}

	log.Println("--- Inserting 'Not Interested' Posts into Database ---")
	sqlStatement := `INSERT INTO activity_log (user_id, activity_type, timestamp, details) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`

	for _, item := range wrapper.Impressions {
		var timestamp int64
		var href string
		for _, data := range item.StringListData {
			if data.Timestamp != 0 {
				timestamp = data.Timestamp
			}
			if data.Href != "" {
				href = data.Href
			}
		}

		if timestamp != 0 {
			ts := time.Unix(timestamp, 0)
			_, err := s.db.Exec(context.Background(), sqlStatement, userID, "post_not_interested", ts, href)
			if err != nil {
				log.Printf("Failed to insert 'not interested' activity: %v", err)
			}
		}
	}
	return nil
}

// Helper function to decode common activity file structures
func decodeActivityFile(path string, wrapper interface{}) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open file %s: %w", path, err)
	}
	defer file.Close()

	if err := json.NewDecoder(file).Decode(wrapper); err != nil {
		return fmt.Errorf("failed to decode %s: %w", path, err)
	}
	return nil
}

// Helper function to insert a batch of generic activity impressions
func (s *APIServer) insertActivityImpressions(userID int, activityType string, impressions []models.ActivityImpression) error {
	sqlStatement := `INSERT INTO activity_log (user_id, activity_type, author, timestamp) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`
	for _, impression := range impressions {
		author := impression.StringMapData.Author.Value
		if author == "" {
			// Fallback for files that use "Username" instead of "Author"
			author = impression.StringMapData.Username.Value
		}

		ts := time.Unix(impression.StringMapData.Timestamp.Timestamp, 0)
		_, err := s.db.Exec(context.Background(), sqlStatement, userID, activityType, author, ts)
		if err != nil {
			// Log error but continue processing other entries
			log.Printf("Failed to insert %s activity for author %s: %v", activityType, author, err)
		}
	}
	return nil
}

func (s *APIServer) getActivityLogHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, activity_type, author, timestamp, details FROM activity_log WHERE user_id=$1 ORDER BY timestamp DESC`, userID)
	if err != nil {
		log.Printf("Failed to query activity log for user %d: %v", userID, err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to retrieve activity log")
		return
	}
	defer rows.Close()

	activities := make([]models.ActivityLog, 0)
	for rows.Next() {
		var a models.ActivityLog
		if err := rows.Scan(&a.ID, &a.UserID, &a.ActivityType, &a.Author, &a.Timestamp, &a.Details); err != nil {
			log.Printf("Failed to scan activity log row: %v", err)
			continue
		}
		activities = append(activities, a)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activities)
}

func (s *APIServer) getLikesHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	type Response struct {
		PostLikes    []models.PostLike    `json:"post_likes"`
		CommentLikes []models.CommentLike `json:"comment_likes"`
		StoryLikes   []models.StoryLike   `json:"story_likes"`
	}
	resp := Response{
		PostLikes:    make([]models.PostLike, 0),
		CommentLikes: make([]models.CommentLike, 0),
		StoryLikes:   make([]models.StoryLike, 0),
	}

	rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, creator_username, post_url, liked_at FROM post_likes WHERE user_id=$1 ORDER BY liked_at DESC`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var l models.PostLike
			if err := rows.Scan(&l.ID, &l.UserID, &l.CreatorUsername, &l.PostURL, &l.LikedAt); err == nil {
				resp.PostLikes = append(resp.PostLikes, l)
			}
		}
	}

	rows2, err := s.db.Query(context.Background(),
		`SELECT id, user_id, owner_username, post_url, liked_at FROM comment_likes WHERE user_id=$1 ORDER BY liked_at DESC`, userID)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var l models.CommentLike
			if err := rows2.Scan(&l.ID, &l.UserID, &l.OwnerUsername, &l.PostURL, &l.LikedAt); err == nil {
				resp.CommentLikes = append(resp.CommentLikes, l)
			}
		}
	}

	rows3, err := s.db.Query(context.Background(),
		`SELECT id, user_id, creator_username, liked_at FROM story_likes WHERE user_id=$1 ORDER BY liked_at DESC`, userID)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var l models.StoryLike
			if err := rows3.Scan(&l.ID, &l.UserID, &l.CreatorUsername, &l.LikedAt); err == nil {
				resp.StoryLikes = append(resp.StoryLikes, l)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *APIServer) getCommentsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	type Response struct {
		PostComments []models.PostComment `json:"post_comments"`
		ReelComments []models.ReelComment `json:"reel_comments"`
	}
	resp := Response{
		PostComments: make([]models.PostComment, 0),
		ReelComments: make([]models.ReelComment, 0),
	}

	rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, post_owner_username, comment_text, commented_at FROM post_comments WHERE user_id=$1 ORDER BY commented_at DESC`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var c models.PostComment
			if err := rows.Scan(&c.ID, &c.UserID, &c.PostOwnerUsername, &c.CommentText, &c.CommentedAt); err == nil {
				resp.PostComments = append(resp.PostComments, c)
			}
		}
	}

	rows2, err := s.db.Query(context.Background(),
		`SELECT id, user_id, reel_owner_username, comment_text, commented_at FROM reel_comments WHERE user_id=$1 ORDER BY commented_at DESC`, userID)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var c models.ReelComment
			if err := rows2.Scan(&c.ID, &c.UserID, &c.ReelOwnerUsername, &c.CommentText, &c.CommentedAt); err == nil {
				resp.ReelComments = append(resp.ReelComments, c)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *APIServer) getSavedHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	type Response struct {
		SavedMedia       []models.SavedMedia           `json:"saved_media"`
		Collections      []models.SavedCollection      `json:"collections"`
		CollectionItems  []models.SavedCollectionItem  `json:"collection_items"`
	}
	resp := Response{
		SavedMedia:      make([]models.SavedMedia, 0),
		Collections:     make([]models.SavedCollection, 0),
		CollectionItems: make([]models.SavedCollectionItem, 0),
	}

	rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, creator_username, post_url, saved_at FROM saved_media WHERE user_id=$1 ORDER BY saved_at DESC`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var m models.SavedMedia
			if err := rows.Scan(&m.ID, &m.UserID, &m.CreatorUsername, &m.PostURL, &m.SavedAt); err == nil {
				resp.SavedMedia = append(resp.SavedMedia, m)
			}
		}
	}

	rows2, err := s.db.Query(context.Background(),
		`SELECT id, user_id, collection_name, created_at, updated_at FROM saved_collections WHERE user_id=$1`, userID)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var c models.SavedCollection
			if err := rows2.Scan(&c.ID, &c.UserID, &c.CollectionName, &c.CreatedAt, &c.UpdatedAt); err == nil {
				resp.Collections = append(resp.Collections, c)
			}
		}
	}

	rows3, err := s.db.Query(context.Background(),
		`SELECT id, user_id, collection_name, item_url, creator_username, added_at FROM saved_collection_items WHERE user_id=$1 ORDER BY added_at DESC`, userID)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var ci models.SavedCollectionItem
			if err := rows3.Scan(&ci.ID, &ci.UserID, &ci.CollectionName, &ci.ItemURL, &ci.CreatorUsername, &ci.AddedAt); err == nil {
				resp.CollectionItems = append(resp.CollectionItems, ci)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *APIServer) getProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	type Response struct {
		Profile *models.UserProfile     `json:"profile"`
		Changes []models.ProfileChange  `json:"changes"`
		Photos  []models.ProfilePhoto   `json:"photos"`
	}
	resp := Response{
		Changes: make([]models.ProfileChange, 0),
		Photos:  make([]models.ProfilePhoto, 0),
	}

	var p models.UserProfile
	err := s.db.QueryRow(context.Background(),
		`SELECT id, user_id, COALESCE(email,''), COALESCE(phone_number,''), COALESCE(username,''),
		        COALESCE(bio,''), COALESCE(gender,''), date_of_birth::TEXT, COALESCE(profile_photo_uri,'')
		 FROM user_profile WHERE user_id=$1`, userID).
		Scan(&p.ID, &p.UserID, &p.Email, &p.PhoneNumber, &p.Username, &p.Bio, &p.Gender, &p.DateOfBirth, &p.ProfilePhotoURI)
	if err == nil {
		resp.Profile = &p
	}

	rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, field_changed, COALESCE(previous_value,''), COALESCE(new_value,''), changed_at
		 FROM profile_changes WHERE user_id=$1 ORDER BY changed_at DESC`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var c models.ProfileChange
			if err := rows.Scan(&c.ID, &c.UserID, &c.FieldChanged, &c.PreviousValue, &c.NewValue, &c.ChangedAt); err == nil {
				resp.Changes = append(resp.Changes, c)
			}
		}
	}

	rows2, err := s.db.Query(context.Background(),
		`SELECT id, user_id, photo_uri, set_at FROM profile_photos WHERE user_id=$1 ORDER BY set_at DESC`, userID)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var ph models.ProfilePhoto
			if err := rows2.Scan(&ph.ID, &ph.UserID, &ph.PhotoURI, &ph.SetAt); err == nil {
				resp.Photos = append(resp.Photos, ph)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *APIServer) getSecurityHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	type Response struct {
		LoginHistory      []models.LoginHistory        `json:"login_history"`
		LogoutHistory     []models.LogoutHistory       `json:"logout_history"`
		PasswordChanges   []models.PasswordChange      `json:"password_changes"`
		PrivacyChanges    []models.PrivacyChange       `json:"privacy_changes"`
		AccountStatus     []models.AccountStatusEntry  `json:"account_status"`
		SignupInfo        *models.SignupInfo            `json:"signup_info"`
	}
	resp := Response{
		LoginHistory:    make([]models.LoginHistory, 0),
		LogoutHistory:   make([]models.LogoutHistory, 0),
		PasswordChanges: make([]models.PasswordChange, 0),
		PrivacyChanges:  make([]models.PrivacyChange, 0),
		AccountStatus:   make([]models.AccountStatusEntry, 0),
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, COALESCE(ip_address,''), COALESCE(user_agent,''), COALESCE(language_code,''), logged_in_at
		 FROM login_history WHERE user_id=$1 ORDER BY logged_in_at DESC LIMIT 200`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var l models.LoginHistory
			if err := rows.Scan(&l.ID, &l.UserID, &l.IPAddress, &l.UserAgent, &l.LanguageCode, &l.LoggedInAt); err == nil {
				resp.LoginHistory = append(resp.LoginHistory, l)
			}
		}
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, COALESCE(ip_address,''), COALESCE(user_agent,''), logged_out_at
		 FROM logout_history WHERE user_id=$1 ORDER BY logged_out_at DESC LIMIT 200`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var l models.LogoutHistory
			if err := rows.Scan(&l.ID, &l.UserID, &l.IPAddress, &l.UserAgent, &l.LoggedOutAt); err == nil {
				resp.LogoutHistory = append(resp.LogoutHistory, l)
			}
		}
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, changed_at FROM password_change_history WHERE user_id=$1 ORDER BY changed_at DESC`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var p models.PasswordChange
			if err := rows.Scan(&p.ID, &p.UserID, &p.ChangedAt); err == nil {
				resp.PasswordChanges = append(resp.PasswordChanges, p)
			}
		}
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, privacy_status, changed_at FROM privacy_changes WHERE user_id=$1 ORDER BY changed_at DESC`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var p models.PrivacyChange
			if err := rows.Scan(&p.ID, &p.UserID, &p.PrivacyStatus, &p.ChangedAt); err == nil {
				resp.PrivacyChanges = append(resp.PrivacyChanges, p)
			}
		}
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, activation_type, COALESCE(reason,''), changed_at FROM account_status_history WHERE user_id=$1 ORDER BY changed_at DESC`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var a models.AccountStatusEntry
			if err := rows.Scan(&a.ID, &a.UserID, &a.ActivationType, &a.Reason, &a.ChangedAt); err == nil {
				resp.AccountStatus = append(resp.AccountStatus, a)
			}
		}
	}

	var si models.SignupInfo
	if err := s.db.QueryRow(context.Background(),
		`SELECT id, user_id, COALESCE(username_at_signup,''), COALESCE(email_at_signup,''),
		        COALESCE(signup_ip,''), COALESCE(device_model,''), signed_up_at
		 FROM signup_info WHERE user_id=$1`, userID).
		Scan(&si.ID, &si.UserID, &si.UsernameAtSignup, &si.EmailAtSignup, &si.SignupIP, &si.DeviceModel, &si.SignedUpAt); err == nil {
		resp.SignupInfo = &si
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *APIServer) getSearchHistoryHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, search_query, search_type, searched_at FROM search_history WHERE user_id=$1 ORDER BY searched_at DESC`, userID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to retrieve search history")
		return
	}
	defer rows.Close()

	result := make([]models.SearchHistoryEntry, 0)
	for rows.Next() {
		var s models.SearchHistoryEntry
		if err := rows.Scan(&s.ID, &s.UserID, &s.SearchQuery, &s.SearchType, &s.SearchedAt); err == nil {
			result = append(result, s)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *APIServer) getStoryInteractionsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	type Response struct {
		Polls     []models.StoryPoll        `json:"polls"`
		Quizzes   []models.StoryQuiz        `json:"quizzes"`
		Questions []models.StoryQuestion    `json:"questions"`
		Sliders   []models.StoryEmojiSlider `json:"emoji_sliders"`
		Reactions []models.StoryReaction    `json:"reactions"`
	}
	resp := Response{
		Polls:     make([]models.StoryPoll, 0),
		Quizzes:   make([]models.StoryQuiz, 0),
		Questions: make([]models.StoryQuestion, 0),
		Sliders:   make([]models.StoryEmojiSlider, 0),
		Reactions: make([]models.StoryReaction, 0),
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, creator_username, COALESCE(poll_answer,''), answered_at FROM story_polls WHERE user_id=$1 ORDER BY answered_at DESC`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var p models.StoryPoll
			if err := rows.Scan(&p.ID, &p.UserID, &p.CreatorUsername, &p.PollAnswer, &p.AnsweredAt); err == nil {
				resp.Polls = append(resp.Polls, p)
			}
		}
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, creator_username, COALESCE(quiz_answer,''), answered_at FROM story_quizzes WHERE user_id=$1 ORDER BY answered_at DESC`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var q models.StoryQuiz
			if err := rows.Scan(&q.ID, &q.UserID, &q.CreatorUsername, &q.QuizAnswer, &q.AnsweredAt); err == nil {
				resp.Quizzes = append(resp.Quizzes, q)
			}
		}
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, creator_username, responded_at FROM story_questions WHERE user_id=$1 ORDER BY responded_at DESC`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var q models.StoryQuestion
			if err := rows.Scan(&q.ID, &q.UserID, &q.CreatorUsername, &q.RespondedAt); err == nil {
				resp.Questions = append(resp.Questions, q)
			}
		}
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, creator_username, COALESCE(slider_value,0), responded_at FROM story_emoji_sliders WHERE user_id=$1 ORDER BY responded_at DESC`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var sl models.StoryEmojiSlider
			if err := rows.Scan(&sl.ID, &sl.UserID, &sl.CreatorUsername, &sl.SliderValue, &sl.RespondedAt); err == nil {
				resp.Sliders = append(resp.Sliders, sl)
			}
		}
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, creator_username, responded_at FROM story_reactions WHERE user_id=$1 ORDER BY responded_at DESC`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var rx models.StoryReaction
			if err := rows.Scan(&rx.ID, &rx.UserID, &rx.CreatorUsername, &rx.RespondedAt); err == nil {
				resp.Reactions = append(resp.Reactions, rx)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *APIServer) getMessagesHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	type Response struct {
		Conversations []models.MessageConversation `json:"conversations"`
		Messages      []models.Message             `json:"messages"`
	}
	resp := Response{
		Conversations: make([]models.MessageConversation, 0),
		Messages:      make([]models.Message, 0),
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, conversation_id, participants, COALESCE(thread_type,'') FROM message_conversations WHERE user_id=$1`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var c models.MessageConversation
			if err := rows.Scan(&c.ID, &c.UserID, &c.ConversationID, &c.Participants, &c.ThreadType); err == nil {
				resp.Conversations = append(resp.Conversations, c)
			}
		}
	}

	// Return only the most recent 500 messages across all conversations
	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, conversation_id, sender_name, COALESCE(content,''), sent_at
		 FROM messages WHERE user_id=$1 ORDER BY sent_at DESC LIMIT 500`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var m models.Message
			if err := rows.Scan(&m.ID, &m.UserID, &m.ConversationID, &m.SenderName, &m.Content, &m.SentAt); err == nil {
				resp.Messages = append(resp.Messages, m)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *APIServer) getTopicsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	type Response struct {
		AIInterests       []models.AIInterest      `json:"ai_interests"`
		Topics            []models.UserTopic       `json:"topics"`
		InferredLocation  *models.InferredLocation `json:"inferred_location"`
		LocationsOfInterest []string               `json:"locations_of_interest"`
	}
	resp := Response{
		AIInterests:         make([]models.AIInterest, 0),
		Topics:              make([]models.UserTopic, 0),
		LocationsOfInterest: make([]string, 0),
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, interest_description, detected_at FROM ai_interests WHERE user_id=$1`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var a models.AIInterest
			if err := rows.Scan(&a.ID, &a.UserID, &a.InterestDescription, &a.DetectedAt); err == nil {
				resp.AIInterests = append(resp.AIInterests, a)
			}
		}
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, topic_name FROM user_topics WHERE user_id=$1 ORDER BY topic_name`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var t models.UserTopic
			if err := rows.Scan(&t.ID, &t.UserID, &t.TopicName); err == nil {
				resp.Topics = append(resp.Topics, t)
			}
		}
	}

	var loc models.InferredLocation
	if err := s.db.QueryRow(context.Background(),
		`SELECT id, user_id, COALESCE(city_name,'') FROM inferred_location WHERE user_id=$1`, userID).
		Scan(&loc.ID, &loc.UserID, &loc.CityName); err == nil {
		resp.InferredLocation = &loc
	}

	if rows, err := s.db.Query(context.Background(),
		`SELECT location_name FROM locations_of_interest WHERE user_id=$1 ORDER BY location_name`, userID); err == nil {
		defer rows.Close()
		for rows.Next() {
			var loc string
			if err := rows.Scan(&loc); err == nil {
				resp.LocationsOfInterest = append(resp.LocationsOfInterest, loc)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *APIServer) getOffMetaActivityHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, app_name, event_type, event_id, event_at FROM off_meta_activity WHERE user_id=$1 ORDER BY event_at DESC`, userID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to retrieve off-meta activity")
		return
	}
	defer rows.Close()

	result := make([]models.OffMetaActivity, 0)
	for rows.Next() {
		var a models.OffMetaActivity
		if err := rows.Scan(&a.ID, &a.UserID, &a.AppName, &a.EventType, &a.EventID, &a.EventAt); err == nil {
			result = append(result, a)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *APIServer) getArchivedPostsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(userIDKey).(int)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	rows, err := s.db.Query(context.Background(),
		`SELECT id, user_id, uri, COALESCE(caption,''), COALESCE(taken_at, NOW()) FROM archived_posts WHERE user_id=$1 ORDER BY taken_at DESC`, userID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to retrieve archived posts")
		return
	}
	defer rows.Close()

	result := make([]models.ArchivedPost, 0)
	for rows.Next() {
		var a models.ArchivedPost
		if err := rows.Scan(&a.ID, &a.UserID, &a.URI, &a.Caption, &a.TakenAt); err == nil {
			result = append(result, a)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
