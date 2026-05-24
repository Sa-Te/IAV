# --- Stage 1: The Builder ---
# Use an official Go image to build our application
FROM golang:1.25-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy all Go module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the Go application into a single static binary
# CGO_ENABLED=0 is important for creating a static binary without system dependencies
RUN CGO_ENABLED=0 GOOS=linux go build -o /main ./cmd/api

# --- Stage 2: The Final Image ---
# Use a minimal 'scratch' or 'alpine' image for the final container
FROM alpine:latest

# Set the working directory
WORKDIR /

# Copy ONLY the compiled binary from the 'builder' stage
COPY --from=builder /main /main

# Copy the migrations folder so the app can find the SQL files
COPY ./migrations ./migrations

# Expose the port our application will run on
EXPOSE 8080

# The command to run when the container starts
CMD ["/main"]