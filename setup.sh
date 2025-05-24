#!/bin/bash

# Make the script exit on any error
set -e

echo "Starting setup process..."

# Run docker compose up
echo "Starting Docker containers..."
bun d:up

# Always generate a fresh admin key
echo "Generating admin key..."
# Run the keygen command and extract the key - the key is output directly without "Admin key:" prefix
ADMIN_KEY=$(bun d:keygen | tail -n 1)
if [ -z "$ADMIN_KEY" ]; then
    echo "Failed to generate admin key"
    exit 1
fi

# Update or create .env.local with the new key
if [ -f .env.local ]; then
    # If file exists, remove old key and add new one
    sed -i '/CONVEX_SELF_HOSTED_ADMIN_KEY/d' .env.local
    echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY" >> .env.local
else
    # If file doesn't exist, create it with the key
    echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY" > .env.local
fi
echo "Admin key has been added to .env.local"

# Run the generateKeys.mjs script and execute its output commands
echo "Setting up JWT keys..."
# Capture and execute each command output by generateKeys.mjs
while IFS= read -r cmd; do
    if [[ $cmd == bunx* ]]; then
        echo "Executing: $cmd"
        eval "$cmd"
    fi
done < <(bun generateKeys.mjs)

clear
echo "Setup completed successfully!" 