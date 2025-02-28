#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Error handling function
error_exit() {
  echo -e "${RED}ERROR: $1${NC}" >&2
  exit 1
}

# Function to display usage information
show_usage() {
  echo -e "${BLUE}Usage:${NC} $0 [patch|minor|major] [tag] [options]"
  echo -e "  patch: Increment the patch version (e.g., 1.0.0 -> 1.0.1) - default"
  echo -e "  minor: Increment the minor version (e.g., 1.0.0 -> 1.1.0)"
  echo -e "  major: Increment the major version (e.g., 1.0.0 -> 2.0.0)"
  echo -e "  tag:   Optional tag for the release (default: latest)"
  echo -e "  --dry-run: Run through the process without actually publishing"
  echo -e "  --test-publish: Simulate publishing without actually publishing to npm"
  echo -e "  --skip-tests: Skip running tests (not recommended)"
  echo
  echo -e "${BLUE}Examples:${NC}"
  echo -e "  $0              # Release a patch update with 'latest' tag"
  echo -e "  $0 patch        # Same as above"
  echo -e "  $0 minor beta   # Release a minor update with 'beta' tag"
  echo -e "  $0 major alpha  # Release a major update with 'alpha' tag"
  echo -e "  $0 patch --dry-run # Test the release process without publishing"
  echo -e "  $0 patch --test-publish # Test the full release process without publishing to npm"
}

# Process arguments
DRY_RUN=false
TEST_PUBLISH=false
SKIP_TESTS=false
VERSION_TYPE="patch"
TAG="latest"

# Parse arguments
for arg in "$@"; do
  if [ "$arg" == "--dry-run" ]; then
    DRY_RUN=true
  elif [ "$arg" == "--test-publish" ]; then
    TEST_PUBLISH=true
  elif [ "$arg" == "--skip-tests" ]; then
    SKIP_TESTS=true
  elif [[ "$arg" =~ ^(patch|minor|major)$ ]]; then
    VERSION_TYPE="$arg"
  elif [[ "$arg" != "--"* ]]; then
    # If it's not a flag (doesn't start with --), treat it as a tag
    # But only if we haven't already set a version type different from the default
    if [[ "$VERSION_TYPE" != "patch" || "$TAG" != "latest" ]]; then
      TAG="$arg"
    fi
  fi
done

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  error_exit "Invalid version type. Must be 'patch', 'minor', or 'major'"
fi

# Get current version from package.json
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")
if [ $? -ne 0 ]; then
  error_exit "Failed to get current version from package.json"
fi

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

# Show mode notices if applicable
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY RUN MODE: No actual publishing will occur${NC}"
  echo -e "${YELLOW}Version will not be updated${NC}"
elif [ "$TEST_PUBLISH" = true ]; then
  echo -e "${YELLOW}TEST PUBLISH MODE: Will simulate publishing without actually publishing to npm${NC}"
  echo -e "${YELLOW}Version will not be updated${NC}"
fi

# Confirm with the user
echo -e "${YELLOW}Current version:${NC} $CURRENT_VERSION"
echo -e "${YELLOW}New version:${NC} $NEW_VERSION"
echo -e "${YELLOW}Tag:${NC} $TAG"
echo
read -p "Do you want to proceed with this release? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Release canceled${NC}"
  exit 0
fi

# Start time measurement
START_TIME=$(date +%s)

# Run tests first unless skipped
if [ "$SKIP_TESTS" = false ]; then
  echo -e "${YELLOW}Running tests...${NC}"
  # Run Jest tests
  bun run test
  if [ $? -ne 0 ]; then
    error_exit "Tests failed. Release aborted."
  else
    echo -e "${GREEN}Tests passed successfully!${NC}"
  fi
else
  echo -e "${YELLOW}WARNING: Tests were skipped. This is not recommended.${NC}"
fi


# Build the package first, before bumping the version
echo -e "${YELLOW}Building the package...${NC}"
bun run build || error_exit "Build failed"

# Publish the package with the current version
echo -e "${YELLOW}Publishing the package...${NC}"
PUBLISH_SUCCESS=false

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}DRY RUN: Skipping actual publish${NC}"
  echo -e "${YELLOW}Command that would run: bun publish --tag $TAG --no-git-checks${NC}"
  PUBLISH_SUCCESS=true
elif [ "$TEST_PUBLISH" = true ]; then
  echo -e "${YELLOW}TEST PUBLISH: Simulating publish without actually publishing to npm${NC}"
  echo -e "${YELLOW}Command that would run: bun publish --tag $TAG --no-git-checks${NC}"
  npm pack --dry-run && PUBLISH_SUCCESS=true || error_exit "Package creation failed"
else
  bun publish --tag $TAG --no-git-checks --silent && PUBLISH_SUCCESS=true || error_exit "Publishing failed"
fi

# Only bump the version if publishing succeeded AND we're not in dry run or test publish mode
if [ "$PUBLISH_SUCCESS" = true ]; then
  if [ "$DRY_RUN" = false ] && [ "$TEST_PUBLISH" = false ]; then
    echo -e "${YELLOW}Publishing successful! Updating version in package.json...${NC}"
    bun run version:bump $VERSION_TYPE || error_exit "Failed to update version"
  else
    echo -e "${YELLOW}Publishing simulation successful! Version will not be updated in dry run or test mode.${NC}"
  fi
else
  # This should never be reached because error_exit will exit the script
  echo -e "${RED}Publishing failed. Version will not be updated.${NC}"
fi

# Calculate elapsed time
END_TIME=$(date +%s)
ELAPSED_TIME=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED_TIME / 60))
SECONDS=$((ELAPSED_TIME % 60))

if [ "$DRY_RUN" = true ]; then
  echo -e "${GREEN}Dry run completed successfully!${NC}"
  echo -e "${GREEN}Current version:${NC} $CURRENT_VERSION (unchanged)"
  echo -e "${GREEN}Simulated new version:${NC} $NEW_VERSION"
elif [ "$TEST_PUBLISH" = true ]; then
  echo -e "${GREEN}Test publish completed successfully!${NC}"
  echo -e "${GREEN}Current version:${NC} $CURRENT_VERSION (unchanged)"
  echo -e "${GREEN}Simulated new version:${NC} $NEW_VERSION"
else
  echo -e "${GREEN}Package published successfully!${NC}"
  echo -e "${GREEN}New version:${NC} $NEW_VERSION"
fi
echo -e "${GREEN}Tag:${NC} $TAG"
echo -e "${GREEN}Time taken:${NC} ${MINUTES}m ${SECONDS}s" 