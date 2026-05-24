package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/Sa-Te/IAV/backend/internal/models"
	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/transform"
)

func isoDecodeFile(path string) (*os.File, *transform.Reader, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	return f, transform.NewReader(f, charmap.ISO8859_1.NewDecoder()), nil
}

// --- Likes ---

func (s *APIServer) processLikedPosts(path string, userID int) error {
	f, r, err := isoDecodeFile(path)
	if err != nil {
		return fmt.Errorf("open liked_posts: %w", err)
	}
	defer f.Close()

	var wrapper models.LikedPostsWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode liked_posts: %w", err)
	}

	sql := `INSERT INTO post_likes (user_id, creator_username, post_url, liked_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, item := range wrapper.Likes {
		for _, d := range item.StringListData {
			_, err := s.db.Exec(context.Background(), sql, userID, item.Title, d.Href, time.Unix(d.Timestamp, 0))
			if err != nil {
				log.Printf("insert post_like %s: %v", item.Title, err)
			}
		}
	}
	log.Printf("Processed liked_posts (%d items)", len(wrapper.Likes))
	return nil
}

func (s *APIServer) processLikedComments(path string, userID int) error {
	f, r, err := isoDecodeFile(path)
	if err != nil {
		return fmt.Errorf("open liked_comments: %w", err)
	}
	defer f.Close()

	var wrapper models.LikedCommentsWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode liked_comments: %w", err)
	}

	sql := `INSERT INTO comment_likes (user_id, owner_username, post_url, liked_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, item := range wrapper.Likes {
		for _, d := range item.StringListData {
			_, err := s.db.Exec(context.Background(), sql, userID, item.Title, d.Href, time.Unix(d.Timestamp, 0))
			if err != nil {
				log.Printf("insert comment_like %s: %v", item.Title, err)
			}
		}
	}
	log.Printf("Processed liked_comments (%d items)", len(wrapper.Likes))
	return nil
}

func (s *APIServer) processStoryLikes(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open story_likes: %w", err)
	}
	defer f.Close()

	var wrapper models.StoryLikesWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode story_likes: %w", err)
	}

	sql := `INSERT INTO story_likes (user_id, creator_username, liked_at)
	        VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`
	for _, item := range wrapper.Likes {
		for _, d := range item.StringListData {
			_, err := s.db.Exec(context.Background(), sql, userID, item.Title, time.Unix(d.Timestamp, 0))
			if err != nil {
				log.Printf("insert story_like %s: %v", item.Title, err)
			}
		}
	}
	log.Printf("Processed story_likes (%d items)", len(wrapper.Likes))
	return nil
}

// --- Comments ---

func (s *APIServer) processPostComments(path string, userID int) error {
	f, r, err := isoDecodeFile(path)
	if err != nil {
		return fmt.Errorf("open post_comments: %w", err)
	}
	defer f.Close()

	// post_comments_1.json is a ROOT ARRAY
	var entries []models.PostCommentEntry
	if err := json.NewDecoder(r).Decode(&entries); err != nil {
		return fmt.Errorf("decode post_comments: %w", err)
	}

	sql := `INSERT INTO post_comments (user_id, post_owner_username, comment_text, commented_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, e := range entries {
		ts := time.Unix(e.StringMapData.Time.Timestamp, 0)
		_, err := s.db.Exec(context.Background(), sql, userID,
			e.StringMapData.MediaOwner.Value,
			e.StringMapData.Comment.Value,
			ts)
		if err != nil {
			log.Printf("insert post_comment: %v", err)
		}
	}
	log.Printf("Processed post_comments (%d items)", len(entries))
	return nil
}

func (s *APIServer) processReelComments(path string, userID int) error {
	f, r, err := isoDecodeFile(path)
	if err != nil {
		return fmt.Errorf("open reel_comments: %w", err)
	}
	defer f.Close()

	var wrapper models.ReelCommentsWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode reel_comments: %w", err)
	}

	sql := `INSERT INTO reel_comments (user_id, reel_owner_username, comment_text, commented_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, c := range wrapper.Comments {
		ts := time.Unix(c.StringMapData.Time.Timestamp, 0)
		_, err := s.db.Exec(context.Background(), sql, userID,
			c.StringMapData.MediaOwner.Value,
			c.StringMapData.Comment.Value,
			ts)
		if err != nil {
			log.Printf("insert reel_comment: %v", err)
		}
	}
	log.Printf("Processed reel_comments (%d items)", len(wrapper.Comments))
	return nil
}

// --- Saved ---

func (s *APIServer) processSavedPosts(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open saved_posts: %w", err)
	}
	defer f.Close()

	var wrapper models.SavedMediaWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode saved_posts: %w", err)
	}

	sql := `INSERT INTO saved_media (user_id, creator_username, post_url, saved_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, item := range wrapper.Media {
		ts := time.Unix(item.StringMapData.SavedOn.Timestamp, 0)
		_, err := s.db.Exec(context.Background(), sql, userID, item.Title, item.StringMapData.SavedOn.Href, ts)
		if err != nil {
			log.Printf("insert saved_media %s: %v", item.Title, err)
		}
	}
	log.Printf("Processed saved_posts (%d items)", len(wrapper.Media))
	return nil
}

func (s *APIServer) processSavedCollections(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open saved_collections: %w", err)
	}
	defer f.Close()

	var wrapper models.SavedCollectionsWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode saved_collections: %w", err)
	}

	collectionSQL := `INSERT INTO saved_collections (user_id, collection_name, created_at, updated_at)
	                  VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	itemSQL := `INSERT INTO saved_collection_items (user_id, collection_name, item_url, creator_username, added_at)
	            VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`

	var currentCollection string
	for _, entry := range wrapper.Collections {
		if entry.StringMapData.CreationTime.Timestamp > 0 {
			// This is a collection header
			currentCollection = entry.StringMapData.Name.Value
			created := time.Unix(entry.StringMapData.CreationTime.Timestamp, 0)
			updated := time.Unix(entry.StringMapData.UpdateTime.Timestamp, 0)
			_, err := s.db.Exec(context.Background(), collectionSQL, userID, currentCollection, created, updated)
			if err != nil {
				log.Printf("insert saved_collection %s: %v", currentCollection, err)
			}
		} else if entry.StringMapData.AddedTime.Timestamp > 0 && entry.StringMapData.Name.Href != "" {
			// This is a collection item
			added := time.Unix(entry.StringMapData.AddedTime.Timestamp, 0)
			_, err := s.db.Exec(context.Background(), itemSQL, userID, currentCollection,
				entry.StringMapData.Name.Href, entry.StringMapData.Name.Value, added)
			if err != nil {
				log.Printf("insert saved_collection_item: %v", err)
			}
		}
	}
	return nil
}

// --- Profile ---

func (s *APIServer) processPersonalInfo(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open personal_information: %w", err)
	}
	defer f.Close()

	var wrapper models.PersonalInfoWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode personal_information: %w", err)
	}

	if len(wrapper.ProfileUser) == 0 {
		return nil
	}
	p := wrapper.ProfileUser[0]
	dob := p.StringMapData.DateOfBirth.Value
	var dobPtr *string
	if dob != "" {
		dobPtr = &dob
	}

	sql := `INSERT INTO user_profile (user_id, email, phone_number, username, bio, gender, date_of_birth, profile_photo_uri)
	        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	        ON CONFLICT (user_id) DO UPDATE SET
	          email=EXCLUDED.email, phone_number=EXCLUDED.phone_number,
	          username=EXCLUDED.username, bio=EXCLUDED.bio,
	          gender=EXCLUDED.gender, date_of_birth=EXCLUDED.date_of_birth,
	          profile_photo_uri=EXCLUDED.profile_photo_uri, updated_at=NOW()`
	_, err = s.db.Exec(context.Background(), sql, userID,
		p.StringMapData.Email.Value,
		p.StringMapData.PhoneNumber.Value,
		p.StringMapData.Username.Value,
		p.StringMapData.Bio.Value,
		p.StringMapData.Gender.Value,
		dobPtr,
		p.MediaMapData.ProfilePhoto.URI)
	if err != nil {
		return fmt.Errorf("upsert user_profile: %w", err)
	}
	log.Printf("Processed personal_information for user %d", userID)
	return nil
}

func (s *APIServer) processProfileChanges(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open profile_changes: %w", err)
	}
	defer f.Close()

	var wrapper models.ProfileChangesWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode profile_changes: %w", err)
	}

	sql := `INSERT INTO profile_changes (user_id, field_changed, previous_value, new_value, changed_at)
	        VALUES ($1,$2,$3,$4,$5)`
	for _, c := range wrapper.Changes {
		ts := time.Unix(c.StringMapData.ChangeDate.Timestamp, 0)
		_, err := s.db.Exec(context.Background(), sql, userID,
			c.StringMapData.Changed.Value,
			c.StringMapData.PreviousValue.Value,
			c.StringMapData.NewValue.Value,
			ts)
		if err != nil {
			log.Printf("insert profile_change: %v", err)
		}
	}
	log.Printf("Processed profile_changes (%d items)", len(wrapper.Changes))
	return nil
}

func (s *APIServer) processProfilePhotos(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open profile_photos: %w", err)
	}
	defer f.Close()

	var wrapper models.ProfilePhotosWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode profile_photos: %w", err)
	}

	sql := `INSERT INTO profile_photos (user_id, photo_uri, set_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`
	for _, p := range wrapper.Photos {
		_, err := s.db.Exec(context.Background(), sql, userID, p.URI, time.Unix(p.CreationTimestamp, 0))
		if err != nil {
			log.Printf("insert profile_photo: %v", err)
		}
	}
	log.Printf("Processed profile_photos (%d items)", len(wrapper.Photos))
	return nil
}

func (s *APIServer) processArchivedPosts(path string, userID int) error {
	f, r, err := isoDecodeFile(path)
	if err != nil {
		return fmt.Errorf("open archived_posts: %w", err)
	}
	defer f.Close()

	var wrapper models.ArchivedPostsWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode archived_posts: %w", err)
	}

	sql := `INSERT INTO archived_posts (user_id, uri, caption, taken_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	count := 0
	for _, post := range wrapper.Posts {
		for _, m := range post.Media {
			_, err := s.db.Exec(context.Background(), sql, userID, m.URI, m.Title, time.Unix(m.CreationTimestamp, 0))
			if err != nil {
				log.Printf("insert archived_post: %v", err)
			}
			count++
		}
	}
	log.Printf("Processed archived_posts (%d items)", count)
	return nil
}

// --- Security ---

func (s *APIServer) processLoginActivity(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open login_activity: %w", err)
	}
	defer f.Close()

	var wrapper models.LoginHistoryWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode login_activity: %w", err)
	}

	sql := `INSERT INTO login_history (user_id, ip_address, user_agent, language_code, logged_in_at)
	        VALUES ($1,$2,$3,$4,$5)`
	for _, h := range wrapper.History {
		ts := time.Unix(h.StringMapData.Time.Timestamp, 0)
		_, err := s.db.Exec(context.Background(), sql, userID,
			h.StringMapData.IPAddress.Value,
			h.StringMapData.UserAgent.Value,
			h.StringMapData.LanguageCode.Value,
			ts)
		if err != nil {
			log.Printf("insert login_history: %v", err)
		}
	}
	log.Printf("Processed login_activity (%d items)", len(wrapper.History))
	return nil
}

func (s *APIServer) processLogoutActivity(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open logout_activity: %w", err)
	}
	defer f.Close()

	var wrapper models.LogoutHistoryWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode logout_activity: %w", err)
	}

	sql := `INSERT INTO logout_history (user_id, ip_address, user_agent, logged_out_at)
	        VALUES ($1,$2,$3,$4)`
	for _, h := range wrapper.History {
		ts := time.Unix(h.StringMapData.Time.Timestamp, 0)
		_, err := s.db.Exec(context.Background(), sql, userID,
			h.StringMapData.IPAddress.Value,
			h.StringMapData.UserAgent.Value,
			ts)
		if err != nil {
			log.Printf("insert logout_history: %v", err)
		}
	}
	log.Printf("Processed logout_activity (%d items)", len(wrapper.History))
	return nil
}

func (s *APIServer) processPasswordChanges(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open password_changes: %w", err)
	}
	defer f.Close()

	var wrapper models.PasswordChangeWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode password_changes: %w", err)
	}

	sql := `INSERT INTO password_change_history (user_id, changed_at) VALUES ($1,$2)`
	for _, h := range wrapper.History {
		_, err := s.db.Exec(context.Background(), sql, userID, time.Unix(h.StringMapData.Time.Timestamp, 0))
		if err != nil {
			log.Printf("insert password_change: %v", err)
		}
	}
	log.Printf("Processed password_changes (%d items)", len(wrapper.History))
	return nil
}

func (s *APIServer) processSignupInfo(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open signup_details: %w", err)
	}
	defer f.Close()

	var wrapper models.SignupInfoWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode signup_details: %w", err)
	}

	if len(wrapper.Info) == 0 {
		return nil
	}
	info := wrapper.Info[0]
	ts := time.Unix(info.StringMapData.Time.Timestamp, 0)
	sql := `INSERT INTO signup_info (user_id, username_at_signup, email_at_signup, signup_ip, device_model, signed_up_at)
	        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO NOTHING`
	_, err = s.db.Exec(context.Background(), sql, userID,
		info.StringMapData.Username.Value,
		info.StringMapData.Email.Value,
		info.StringMapData.IPAddress.Value,
		info.StringMapData.Device.Value,
		ts)
	if err != nil {
		return fmt.Errorf("insert signup_info: %w", err)
	}
	return nil
}

func (s *APIServer) processPrivacyChanges(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open privacy_changes: %w", err)
	}
	defer f.Close()

	var wrapper models.PrivacyChangesWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode privacy_changes: %w", err)
	}

	sql := `INSERT INTO privacy_changes (user_id, privacy_status, changed_at) VALUES ($1,$2,$3)`
	for _, h := range wrapper.History {
		status := strings.ToLower(h.Title)
		if strings.Contains(status, "private") {
			status = "private"
		} else {
			status = "public"
		}
		_, err := s.db.Exec(context.Background(), sql, userID, status, time.Unix(h.StringMapData.Time.Timestamp, 0))
		if err != nil {
			log.Printf("insert privacy_change: %v", err)
		}
	}
	log.Printf("Processed privacy_changes (%d items)", len(wrapper.History))
	return nil
}

func (s *APIServer) processAccountStatus(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open account_status: %w", err)
	}
	defer f.Close()

	var wrapper models.AccountStatusWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode account_status: %w", err)
	}

	sql := `INSERT INTO account_status_history (user_id, activation_type, reason, changed_at) VALUES ($1,$2,$3,$4)`
	for _, h := range wrapper.History {
		_, err := s.db.Exec(context.Background(), sql, userID,
			h.StringMapData.ActivationType.Value,
			h.StringMapData.Reason.Value,
			time.Unix(h.StringMapData.Time.Timestamp, 0))
		if err != nil {
			log.Printf("insert account_status: %v", err)
		}
	}
	return nil
}

// --- Story Interactions ---

func (s *APIServer) processStoryPolls(path string, userID int) error {
	f, r, err := isoDecodeFile(path)
	if err != nil {
		return fmt.Errorf("open polls: %w", err)
	}
	defer f.Close()

	var wrapper models.StoryPollsWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode polls: %w", err)
	}

	sql := `INSERT INTO story_polls (user_id, creator_username, poll_answer, answered_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, p := range wrapper.Polls {
		for _, d := range p.StringListData {
			_, err := s.db.Exec(context.Background(), sql, userID, p.Title, d.Value, time.Unix(d.Timestamp, 0))
			if err != nil {
				log.Printf("insert story_poll: %v", err)
			}
		}
	}
	log.Printf("Processed polls (%d items)", len(wrapper.Polls))
	return nil
}

func (s *APIServer) processStoryQuizzes(path string, userID int) error {
	f, r, err := isoDecodeFile(path)
	if err != nil {
		return fmt.Errorf("open quizzes: %w", err)
	}
	defer f.Close()

	var wrapper models.StoryQuizzesWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode quizzes: %w", err)
	}

	sql := `INSERT INTO story_quizzes (user_id, creator_username, quiz_answer, answered_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, q := range wrapper.Quizzes {
		for _, d := range q.StringListData {
			_, err := s.db.Exec(context.Background(), sql, userID, q.Title, d.Value, time.Unix(d.Timestamp, 0))
			if err != nil {
				log.Printf("insert story_quiz: %v", err)
			}
		}
	}
	return nil
}

func (s *APIServer) processStoryQuestions(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open questions: %w", err)
	}
	defer f.Close()

	var wrapper models.StoryQuestionsWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode questions: %w", err)
	}

	sql := `INSERT INTO story_questions (user_id, creator_username, responded_at)
	        VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`
	for _, q := range wrapper.Questions {
		for _, d := range q.StringListData {
			_, err := s.db.Exec(context.Background(), sql, userID, q.Title, time.Unix(d.Timestamp, 0))
			if err != nil {
				log.Printf("insert story_question: %v", err)
			}
		}
	}
	return nil
}

func (s *APIServer) processEmojiSliders(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open emoji_sliders: %w", err)
	}
	defer f.Close()

	var wrapper models.StoryEmojiSlidersWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode emoji_sliders: %w", err)
	}

	sql := `INSERT INTO story_emoji_sliders (user_id, creator_username, slider_value, responded_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, s2 := range wrapper.Sliders {
		for _, d := range s2.StringListData {
			val, _ := strconv.ParseFloat(d.Value, 64)
			_, err := s.db.Exec(context.Background(), sql, userID, s2.Title, val, time.Unix(d.Timestamp, 0))
			if err != nil {
				log.Printf("insert emoji_slider: %v", err)
			}
		}
	}
	return nil
}

func (s *APIServer) processStoryReactions(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open story_reactions: %w", err)
	}
	defer f.Close()

	var wrapper models.StoryReactionsWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode story_reactions: %w", err)
	}

	sql := `INSERT INTO story_reactions (user_id, creator_username, responded_at)
	        VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`
	for _, r := range wrapper.Reactions {
		for _, d := range r.StringListData {
			_, err := s.db.Exec(context.Background(), sql, userID, r.Title, time.Unix(d.Timestamp, 0))
			if err != nil {
				log.Printf("insert story_reaction: %v", err)
			}
		}
	}
	return nil
}

// --- Search History ---

func (s *APIServer) processProfileSearches(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open profile_searches: %w", err)
	}
	defer f.Close()

	var wrapper models.ProfileSearchesWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode profile_searches: %w", err)
	}

	sql := `INSERT INTO search_history (user_id, search_query, search_type, searched_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, item := range wrapper.Searches {
		_, err := s.db.Exec(context.Background(), sql, userID,
			item.StringMapData.Search.Value, "user",
			time.Unix(item.StringMapData.Time.Timestamp, 0))
		if err != nil {
			log.Printf("insert profile_search: %v", err)
		}
	}
	log.Printf("Processed profile_searches (%d items)", len(wrapper.Searches))
	return nil
}

func (s *APIServer) processKeywordSearches(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open keyword_searches: %w", err)
	}
	defer f.Close()

	var wrapper models.KeywordSearchesWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode keyword_searches: %w", err)
	}

	sql := `INSERT INTO search_history (user_id, search_query, search_type, searched_at)
	        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`
	for _, item := range wrapper.Searches {
		_, err := s.db.Exec(context.Background(), sql, userID,
			item.StringMapData.Search.Value, "keyword",
			time.Unix(item.StringMapData.Time.Timestamp, 0))
		if err != nil {
			log.Printf("insert keyword_search: %v", err)
		}
	}
	log.Printf("Processed keyword_searches (%d items)", len(wrapper.Searches))
	return nil
}

// --- Messages ---

func (s *APIServer) processMessageFile(path string, userID int) error {
	f, r, err := isoDecodeFile(path)
	if err != nil {
		return fmt.Errorf("open message file: %w", err)
	}
	defer f.Close()

	var mf models.MessageFile
	if err := json.NewDecoder(r).Decode(&mf); err != nil {
		return fmt.Errorf("decode message file: %w", err)
	}

	// Build participants JSON string
	names := make([]string, 0, len(mf.Participants))
	for _, p := range mf.Participants {
		names = append(names, p.Name)
	}
	participants := strings.Join(names, ", ")

	// conversation_id = parent directory name
	conversationID := filepath.Base(filepath.Dir(path))

	convSQL := `INSERT INTO message_conversations (user_id, conversation_id, participants, thread_type)
	            VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, conversation_id) DO NOTHING`
	_, err = s.db.Exec(context.Background(), convSQL, userID, conversationID, participants, mf.ThreadType)
	if err != nil {
		log.Printf("insert conversation %s: %v", conversationID, err)
	}

	msgSQL := `INSERT INTO messages (user_id, conversation_id, sender_name, content, sent_at)
	           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`
	for _, msg := range mf.Messages {
		sentAt := time.UnixMilli(msg.TimestampMs)
		_, err := s.db.Exec(context.Background(), msgSQL, userID,
			conversationID, msg.SenderName, msg.Content, sentAt)
		if err != nil {
			log.Printf("insert message: %v", err)
		}
	}
	log.Printf("Processed message file %s (%d messages)", conversationID, len(mf.Messages))
	return nil
}

// --- AI / Topics / Location ---

func (s *APIServer) processAIInterests(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open interest_categories: %w", err)
	}
	defer f.Close()

	// interest_categories.json is a ROOT ARRAY
	var entries []models.AIInterestEntry
	if err := json.NewDecoder(f).Decode(&entries); err != nil {
		return fmt.Errorf("decode interest_categories: %w", err)
	}

	sql := `INSERT INTO ai_interests (user_id, interest_description, detected_at)
	        VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`
	for _, entry := range entries {
		for _, lv := range entry.LabelValues {
			if lv.Label == "Interest" && lv.Value != "" {
				detectedAt := time.Unix(entry.Timestamp, 0)
				_, err := s.db.Exec(context.Background(), sql, userID, lv.Value, detectedAt)
				if err != nil {
					log.Printf("insert ai_interest: %v", err)
				}
			}
		}
	}
	log.Printf("Processed interest_categories (%d entries)", len(entries))
	return nil
}

func (s *APIServer) processUserTopics(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open recommended_topics: %w", err)
	}
	defer f.Close()

	var wrapper models.UserTopicsWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode recommended_topics: %w", err)
	}

	sql := `INSERT INTO user_topics (user_id, topic_name) VALUES ($1,$2) ON CONFLICT DO NOTHING`
	for _, t := range wrapper.Topics {
		_, err := s.db.Exec(context.Background(), sql, userID, t.StringMapData.Name.Value)
		if err != nil {
			log.Printf("insert user_topic: %v", err)
		}
	}
	log.Printf("Processed recommended_topics (%d items)", len(wrapper.Topics))
	return nil
}

func (s *APIServer) processInferredLocation(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open profile_based_in: %w", err)
	}
	defer f.Close()

	var wrapper models.InferredLocationWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode profile_based_in: %w", err)
	}

	if len(wrapper.Location) == 0 {
		return nil
	}
	sql := `INSERT INTO inferred_location (user_id, city_name) VALUES ($1,$2)
	        ON CONFLICT (user_id) DO UPDATE SET city_name=EXCLUDED.city_name`
	_, err = s.db.Exec(context.Background(), sql, userID, wrapper.Location[0].StringMapData.CityName.Value)
	return err
}

func (s *APIServer) processLocationsOfInterest(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open locations_of_interest: %w", err)
	}
	defer f.Close()

	var wrapper models.LocationsOfInterestWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode locations_of_interest: %w", err)
	}

	sql := `INSERT INTO locations_of_interest (user_id, location_name) VALUES ($1,$2) ON CONFLICT DO NOTHING`
	for _, lv := range wrapper.LabelValues {
		if lv.Label == "Locations of interest" {
			for _, v := range lv.Vec {
				_, err := s.db.Exec(context.Background(), sql, userID, v.Value)
				if err != nil {
					log.Printf("insert location_of_interest: %v", err)
				}
			}
		}
	}
	return nil
}

// --- Off-Meta Activity ---

func (s *APIServer) processOffMetaActivity(path string, userID int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open off_meta_activity: %w", err)
	}
	defer f.Close()

	var wrapper models.OffMetaActivityWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		return fmt.Errorf("decode off_meta_activity: %w", err)
	}

	sql := `INSERT INTO off_meta_activity (user_id, app_name, event_type, event_id, event_at)
	        VALUES ($1,$2,$3,$4,$5)`
	count := 0
	for _, app := range wrapper.Activity {
		for _, ev := range app.Events {
			_, err := s.db.Exec(context.Background(), sql, userID,
				app.Name, ev.Type, ev.ID, time.Unix(ev.Timestamp, 0))
			if err != nil {
				log.Printf("insert off_meta_activity %s: %v", app.Name, err)
			}
			count++
		}
	}
	log.Printf("Processed off_meta_activity (%d events)", count)
	return nil
}
