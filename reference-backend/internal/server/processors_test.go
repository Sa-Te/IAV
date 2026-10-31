package server

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Sa-Te/IAV/backend/internal/models"
)

// archivePath resolves a path relative to the repository archive folder.
// Tests run from the package directory (backend/internal/server), so 3 levels up
// reaches the repo root where archive/ lives.
func archivePath(parts ...string) string {
	base := filepath.Join("..", "..", "..")
	all := append([]string{base, "archive"}, parts...)
	return filepath.Join(all...)
}

func TestDecodeLikedPosts(t *testing.T) {
	path := archivePath("your_instagram_activity", "likes", "liked_posts.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, r, err := isoDecodeFile(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.LikedPostsWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.Likes) == 0 {
		t.Fatal("expected at least one liked post")
	}
	first := wrapper.Likes[0]
	if first.Title == "" {
		t.Error("expected non-empty creator username")
	}
	if len(first.StringListData) == 0 {
		t.Fatal("expected string_list_data")
	}
	if first.StringListData[0].Timestamp == 0 {
		t.Error("expected non-zero timestamp")
	}
	t.Logf("liked_posts: %d entries, first creator: %s", len(wrapper.Likes), first.Title)
}

func TestDecodeLikedComments(t *testing.T) {
	path := archivePath("your_instagram_activity", "likes", "liked_comments.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, r, err := isoDecodeFile(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.LikedCommentsWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.Likes) == 0 {
		t.Fatal("expected at least one liked comment")
	}
	t.Logf("liked_comments: %d entries", len(wrapper.Likes))
}

func TestDecodePostComments(t *testing.T) {
	path := archivePath("your_instagram_activity", "comments", "post_comments_1.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, r, err := isoDecodeFile(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	// post_comments_1.json is a root array
	var entries []models.PostCommentEntry
	if err := json.NewDecoder(r).Decode(&entries); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("expected at least one comment")
	}
	first := entries[0]
	if first.StringMapData.Comment.Value == "" {
		t.Error("expected non-empty comment text")
	}
	if first.StringMapData.Time.Timestamp == 0 {
		t.Error("expected non-zero timestamp")
	}
	t.Logf("post_comments: %d entries, first owner: %s", len(entries), first.StringMapData.MediaOwner.Value)
}

func TestDecodeReelComments(t *testing.T) {
	path := archivePath("your_instagram_activity", "comments", "reels_comments.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, r, err := isoDecodeFile(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.ReelCommentsWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	t.Logf("reel_comments: %d entries", len(wrapper.Comments))
}

func TestDecodeSavedPosts(t *testing.T) {
	path := archivePath("your_instagram_activity", "saved", "saved_posts.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.SavedMediaWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.Media) == 0 {
		t.Fatal("expected at least one saved post")
	}
	first := wrapper.Media[0]
	if first.StringMapData.SavedOn.Href == "" {
		t.Error("expected non-empty post URL")
	}
	t.Logf("saved_posts: %d entries, first creator: %s", len(wrapper.Media), first.Title)
}

func TestDecodeSavedCollections(t *testing.T) {
	path := archivePath("your_instagram_activity", "saved", "saved_collections.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.SavedCollectionsWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	t.Logf("saved_collections: %d total entries", len(wrapper.Collections))
}

func TestDecodePersonalInfo(t *testing.T) {
	path := archivePath("personal_information", "personal_information", "personal_information.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.PersonalInfoWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.ProfileUser) == 0 {
		t.Fatal("expected profile_user array")
	}
	p := wrapper.ProfileUser[0]
	if p.StringMapData.Username.Value == "" {
		t.Error("expected non-empty username")
	}
	t.Logf("personal_info: username=%s, email=%s", p.StringMapData.Username.Value, p.StringMapData.Email.Value)
}

func TestDecodeProfileChanges(t *testing.T) {
	path := archivePath("personal_information", "personal_information", "profile_changes.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.ProfileChangesWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.Changes) == 0 {
		t.Fatal("expected at least one profile change")
	}
	t.Logf("profile_changes: %d entries", len(wrapper.Changes))
}

func TestDecodeLoginHistory(t *testing.T) {
	path := archivePath("security_and_login_information", "login_and_profile_creation", "login_activity.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.LoginHistoryWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.History) == 0 {
		t.Fatal("expected at least one login")
	}
	first := wrapper.History[0]
	if first.StringMapData.IPAddress.Value == "" {
		t.Error("expected non-empty IP address")
	}
	if first.StringMapData.Time.Timestamp == 0 {
		t.Error("expected non-zero timestamp")
	}
	ts := time.Unix(first.StringMapData.Time.Timestamp, 0)
	t.Logf("login_history: %d entries, most recent IP: %s at %s", len(wrapper.History), first.StringMapData.IPAddress.Value, ts.Format(time.RFC3339))
}

func TestDecodeSignupInfo(t *testing.T) {
	path := archivePath("security_and_login_information", "login_and_profile_creation", "signup_details.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.SignupInfoWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.Info) == 0 {
		t.Fatal("expected signup info")
	}
	info := wrapper.Info[0]
	t.Logf("signup_info: username=%s, ip=%s", info.StringMapData.Username.Value, info.StringMapData.IPAddress.Value)
}

func TestDecodeStoryPolls(t *testing.T) {
	path := archivePath("your_instagram_activity", "story_interactions", "polls.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, r, err := isoDecodeFile(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.StoryPollsWrapper
	if err := json.NewDecoder(r).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.Polls) == 0 {
		t.Fatal("expected at least one poll")
	}
	t.Logf("polls: %d entries, first creator: %s, answer: %s", len(wrapper.Polls), wrapper.Polls[0].Title, wrapper.Polls[0].StringListData[0].Value)
}

func TestDecodeProfileSearches(t *testing.T) {
	path := archivePath("logged_information", "recent_searches", "profile_searches.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.ProfileSearchesWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.Searches) == 0 {
		t.Fatal("expected at least one search")
	}
	t.Logf("profile_searches: %d entries", len(wrapper.Searches))
}

func TestDecodeMessageFile(t *testing.T) {
	base := archivePath("your_instagram_activity", "messages", "inbox")
	entries, err := os.ReadDir(base)
	if err != nil || len(entries) == 0 {
		t.Skip("no message conversations in archive")
	}

	// Find first message_1.json
	var msgPath string
	for _, e := range entries {
		if e.IsDir() {
			candidate := filepath.Join(base, e.Name(), "message_1.json")
			if _, err := os.Stat(candidate); err == nil {
				msgPath = candidate
				break
			}
		}
	}
	if msgPath == "" {
		t.Skip("no message_1.json found")
	}

	f, r, err := isoDecodeFile(msgPath)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var mf models.MessageFile
	if err := json.NewDecoder(r).Decode(&mf); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(mf.Participants) == 0 {
		t.Error("expected at least one participant")
	}
	if len(mf.Messages) == 0 {
		t.Error("expected at least one message")
	}
	first := mf.Messages[0]
	if first.TimestampMs == 0 {
		t.Error("expected non-zero timestamp_ms")
	}
	// Verify millisecond conversion works
	ts := time.UnixMilli(first.TimestampMs)
	if ts.Year() < 2010 {
		t.Errorf("timestamp looks wrong: %s", ts.Format(time.RFC3339))
	}
	names := make([]string, 0, len(mf.Participants))
	for _, p := range mf.Participants {
		names = append(names, p.Name)
	}
	t.Logf("message file: %d messages, participants: %s", len(mf.Messages), strings.Join(names, ", "))
}

func TestDecodeAIInterests(t *testing.T) {
	path := archivePath("your_instagram_activity", "ai", "interest_categories.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	// Root array
	var entries []models.AIInterestEntry
	if err := json.NewDecoder(f).Decode(&entries); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("expected at least one AI interest entry")
	}

	var interests []string
	for _, e := range entries {
		for _, lv := range e.LabelValues {
			if lv.Label == "Interest" && lv.Value != "" {
				interests = append(interests, lv.Value)
			}
		}
	}
	if len(interests) == 0 {
		t.Error("expected at least one interest description")
	}
	t.Logf("ai_interests: %d entries, first: %s", len(interests), interests[0])
}

func TestDecodeOffMetaActivity(t *testing.T) {
	path := archivePath("apps_and_websites_off_of_instagram", "apps_and_websites", "your_activity_off_meta_technologies.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.OffMetaActivityWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.Activity) == 0 {
		t.Fatal("expected at least one app activity")
	}
	app := wrapper.Activity[0]
	if app.Name == "" {
		t.Error("expected non-empty app name")
	}
	if len(app.Events) == 0 {
		t.Error("expected at least one event")
	}
	t.Logf("off_meta_activity: %d apps, first: %s with %d events", len(wrapper.Activity), app.Name, len(app.Events))
}

func TestDecodeInferredLocation(t *testing.T) {
	path := archivePath("personal_information", "information_about_you", "profile_based_in.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Skip("archive not present")
	}

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer f.Close()

	var wrapper models.InferredLocationWrapper
	if err := json.NewDecoder(f).Decode(&wrapper); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(wrapper.Location) == 0 {
		t.Fatal("expected location entry")
	}
	city := wrapper.Location[0].StringMapData.CityName.Value
	if city == "" {
		t.Error("expected non-empty city name")
	}
	t.Logf("inferred_location: %s", city)
}

func TestProcessorMapHasAllExpectedKeys(t *testing.T) {
	required := []string{
		"posts_1.json",
		"stories.json",
		"liked_posts.json",
		"liked_comments.json",
		"story_likes.json",
		"post_comments_1.json",
		"reels_comments.json",
		"saved_posts.json",
		"saved_collections.json",
		"personal_information.json",
		"profile_changes.json",
		"profile_photos.json",
		"archived_posts.json",
		"login_activity.json",
		"logout_activity.json",
		"password_change_activity.json",
		"signup_details.json",
		"profile_privacy_changes.json",
		"profile_status_changes.json",
		"polls.json",
		"quizzes.json",
		"questions.json",
		"emoji_sliders.json",
		"story_reaction_sticker_reactions.json",
		"profile_searches.json",
		"word_or_phrase_searches.json",
		"interest_categories.json",
		"recommended_topics.json",
		"profile_based_in.json",
		"locations_of_interest.json",
		"your_activity_off_meta_technologies.json",
	}

	for _, key := range required {
		if _, ok := processorMap[key]; !ok {
			t.Errorf("processorMap missing key: %s", key)
		}
	}
	t.Logf("processorMap has %d entries", len(processorMap))
}
