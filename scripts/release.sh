#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage information
show_usage() {
  echo -e "${BLUE}Usage:${NC} $0 [patch|minor|major] [tag]"
  echo -e "  patch: Increment the patch version (e.g., 1.0.0 -> 1.0.1)"
  echo -e "  minor: Increment the minor version (e.g., 1.0.0 -> 1.1.0)"
  echo -e "  major: Increment the major version (e.g., 1.0.0 -> 2.0.0)"
  echo -e "  tag:   Optional tag for the release (default: latest)"
  echo
  echo -e "${BLUE}Examples:${NC}"
  echo -e "  $0 patch         # Release a patch update with 'latest' tag"
  echo -e "  $0 minor beta    # Release a minor update with 'beta' tag"
  echo -e "  $0 major alpha   # Release a major update with 'alpha' tag"
}

# Check if version type is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No version type specified${NC}"
  show_usage
  exit 1
fi

# Validate version type
VERSION_TYPE=$1
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}Error: Invalid version type. Must be 'patch', 'minor', or 'major'${NC}"
  show_usage
  exit 1
fi

# Set tag (default to 'latest' if not provided)
TAG=${2:-latest}

# Get current version from package.json
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")

# Calculate new version based on semver rules without modifying package.json
calculate_new_version() {
  local current=$1
  local type=$2
  
  # Split version into major, minor, patch
  IFS='.' read -r major minor patch <<< "$current"
  
  case "$type" in
    patch)
      echo "$major.$minor.$((patch + 1))"
      ;;
    minor)
      echo "$major.$((minor + 1)).0"
      ;;
    major)
      echo "$((major + 1)).0.0"
      ;;
  esac
}

# Calculate the new version
NEW_VERSION=$(calculate_new_version "$CURRENT_VERSION" "$VERSION_TYPE")

# Confirm with the user
echo -e "${YELLOW}Current version:${NC} $CURRENT_VERSION"
echo -e "${YELLOW}New version:${NC} $NEW_VERSION"
echo -e "${YELLOW}Tag:${NC} $TAG"
echo
read -p "Do you want to proceed with this release? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Release canceled${NC}"
  exit 1
fi

# Update version in package.json
echo -e "${YELLOW}Updating version in package.json...${NC}"
npm version $VERSION_TYPE --no-git-tag-version

# Generate index files
echo -e "${YELLOW}Generating index files...${NC}"
./scripts/generate-indexes.sh

# Build the package
echo -e "${YELLOW}Building the package...${NC}"
bun run build

# Publish the package
echo -e "${YELLOW}Publishing the package...${NC}"
bun publish --tag $TAG

echo -e "${GREEN}Package published successfully!${NC}"
echo -e "${GREEN}Version:${NC} $NEW_VERSION"
echo -e "${GREEN}Tag:${NC} $TAG" 