#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if version is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No version specified${NC}"
  echo -e "Usage: $0 <version> [tag]"
  echo -e "Example: $0 1.0.1"
  echo -e "Example: $0 1.0.1-beta beta"
  exit 1
fi

VERSION=$1
TAG=${2:-latest}

# Confirm with the user
echo -e "${YELLOW}You are about to publish version ${VERSION} with tag ${TAG}${NC}"
read -p "Are you sure? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Publish canceled${NC}"
  exit 1
fi

# Update version in package.json
echo -e "${YELLOW}Updating version in package.json...${NC}"
# Note: Using npm for version command as bun doesn't have an equivalent
npm version $VERSION --no-git-tag-version

# Build the package (this will clean, generate indexes, format, and compile)
echo -e "${YELLOW}Building the package...${NC}"
bun run build

# Publish the package
echo -e "${YELLOW}Publishing the package...${NC}"
bun publish --tag $TAG

echo -e "${GREEN}Package published successfully!${NC}"