package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/Sa-Te/IAV/backend/internal/server"
	"github.com/jackc/pgx/v5/pgxpool"
)

func runMigrations(db *pgxpool.Pool) {

	applyMigration(db, "migrations/001_create_users_table.sql", "users")
	applyMigration(db, "migrations/002_create_media_items_table.sql", "media_items")
	applyMigration(db, "migrations/003_alter_media_items_for_media_type.sql", "media_type")
	applyMigration(db, "migrations/004_add_unique_constraint_to_media_items.sql", "media_items")
	applyMigration(db, "migrations/005_create_connections_table.sql", "connections")
	applyMigration(db, "migrations/006_add_contact_info_to_connections.sql", "connections")
	applyMigration(db, "migrations/007_create_followed_hashtags_table.sql", "followed_hashtags")
	applyMigration(db, "migrations/008_create_ad_interests_tables.sql", "ad_interests")
	applyMigration(db, "migrations/009_create_activity_log_table.sql", "activity_log")
	applyMigration(db, "migrations/010_create_likes_tables.sql", "likes")
	applyMigration(db, "migrations/011_create_comments_tables.sql", "comments")
	applyMigration(db, "migrations/012_create_saved_tables.sql", "saved")
	applyMigration(db, "migrations/013_create_profile_tables.sql", "profile")
	applyMigration(db, "migrations/014_create_security_tables.sql", "security")
	applyMigration(db, "migrations/015_create_story_interactions_tables.sql", "story_interactions")
	applyMigration(db, "migrations/016_create_search_history_table.sql", "search_history")
	applyMigration(db, "migrations/017_create_messages_tables.sql", "messages")
	applyMigration(db, "migrations/018_create_devices_settings_tables.sql", "devices_settings")
	applyMigration(db, "migrations/019_create_misc_tables.sql", "misc")
	applyMigration(db, "migrations/020_dedup_messages_and_activity.sql", "dedup")
}

func applyMigration(db *pgxpool.Pool, filepath string, tableName string) {
	migrationSQL, err := os.ReadFile(filepath)
	if err != nil {
		log.Fatalf(`Failed to read %s migrations file: %v`, tableName, err)
	}

	_, err = db.Exec(context.Background(), string(migrationSQL))
	if err != nil {
		fmt.Printf("could not apply %s migration: %v\n", tableName, err)
	} else {
		fmt.Printf("%s table migration successful\n", tableName)
	}
}

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		// We can set a fallback for local running without Docker, but the env var is primary.
		connStr = "postgres://postgres:letmeinfast@localhost:5432/postgres?client_encoding=utf8"
		log.Println("DATABASE_URL not set, using default fallback.")
	}

	db, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to create connection pool: %v\n", err)
		os.Exit(1)
	}
	// Use db.Close() for the pool
	defer db.Close()
	log.Println("Successfully connected to PostgreSQL and created connection pool!")

	runMigrations(db)

	// Pass the entire pool to the server
	apiServer := server.NewAPIServer(db)
	apiServer.Run()
}
