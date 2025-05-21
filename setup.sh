#!/bin/bash

# Make the script exit on any error
set -e

echo "Starting setup process..."

# Run docker compose up
echo "Starting Docker containers..."
bun d:up

# Check if CONVEX_SELF_HOSTED_ADMIN_KEY exists in .env.local
if ! grep -q "CONVEX_SELF_HOSTED_ADMIN_KEY" .env.local 2>/dev/null; then
    echo "Generating admin key..."
    # Run the keygen command and extract the key
    ADMIN_KEY=$(docker-compose -f docker/docker-compose.yml exec -T backend ./generate_admin_key.sh | grep "convex-self-hosted|" | tr -d '\r')
    
    # Add or update the key in .env.local
    if [ -f .env.local ]; then
        # If file exists, append the key
        echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY" >> .env.local
    else
        # If file doesn't exist, create it with the key
        echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY" > .env.local
    fi
    echo "Admin key has been added to .env.local"
fi

# Run the generateKeys.mjs script and execute its output commands
echo "Setting up JWT keys..."
# Capture and execute each command output by generateKeys.mjs
while IFS= read -r cmd; do
    if [[ $cmd == bunx* ]]; then
        echo "Executing: $cmd"
        eval "$cmd"
    fi
done < <(bun generateKeys.mjs)

echo "Setup completed successfully!" 