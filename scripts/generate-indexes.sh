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

echo -e "${BLUE}Generating index files...${NC}"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
  error_exit "Bun is required but not installed. Please install Bun.js."
fi

# Run the TypeScript version of the script directly with Bun
bun run scripts/generate-indexes.ts

# Check if the script ran successfully
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Index files generated successfully!${NC}"
else
  error_exit "Failed to generate index files."
fi 