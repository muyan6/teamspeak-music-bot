#!/bin/bash
set -e

echo "==================================================="
echo "  Building TSMusicBot Docker Image (Local Build)"
echo "==================================================="

docker build -f scripts/docker/Dockerfile -t tsmusicbot:latest .

echo ""
echo "==================================================="
echo "  Docker Image Built Successfully: tsmusicbot:latest"
echo "==================================================="
echo ""
echo "You can run the container with:"
echo "  docker run -d --name tsmusicbot-custom --restart unless-stopped --network host -v tsmusicbot-custom-data:/app/data tsmusicbot:latest"
echo ""
