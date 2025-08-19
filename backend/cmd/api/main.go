package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/Sa-Te/IAV/backend/internal/server"
	"github.com/jackc/pgx/v5/pgxpool"
)

// This function now takes a pool instead of a single connection
func runMigrations(db *pgxpool.Pool) {
	// The logic inside remains the same, as the pool can execute commands too
	applyMigration(db, "migrations/001_create_users_table.sql", "users")
	applyMigration(db, "migrations/002_create_media_items_table.sql", "media_items")
	applyMigration(db, "migrations/003_alter_media_items_for_media_type.sql", "media_type")
}

// This helper function also needs to accept the pool type
func applyMigration(db *pgxpool.Pool, filepath string, tableName string) {
	migrationSQL, err := os.ReadFile(filepath)
	if err != nil {
		log.Fatalf(`Failed to read %s migrations file: %v`, tableName, err)
	}

	_, err = db.Exec(context.Background(), string(migrationSQL))
	if err != nil {
		fmt.Printf("could not apply %s migration (table might already exist)\n", tableName)
	} else {
		fmt.Printf("%s table migration successful\n", tableName)
	}
}

func main() {
	connStr := "postgres://postgres:letmeinfast@localhost:5432/postgres"

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
