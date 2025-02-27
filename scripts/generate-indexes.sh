#!/bin/bash

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Define the output file
INDEX_FILE="src/index.ts"

# Clear the existing index file
cat > $INDEX_FILE << EOL
// This file is auto-generated by scripts/generate-indexes.sh
// Do not edit this file directly

EOL

# Find all TypeScript files in the src directory and subdirectories, excluding the index.ts file itself and test files
# Use a single find command and store the results to avoid multiple file system traversals
FILES=$(find src -type f -name "*.ts" -not -path "*/index.ts" -not -path "*/*.test.ts" -not -path "*/__tests__/*" | sort)

# Create a temporary file for building the index content
TMP_INDEX=$(mktemp)

# First, export all modules that don't have default exports
echo "// Export all modules" >> $TMP_INDEX
for file in $FILES; do
  # Extract the relative path from src
  rel_path=${file#src/}
  # Extract the directory path if any
  dir_path=$(dirname "$rel_path")
  # Extract the filename without extension
  filename=$(basename "$rel_path" .ts)
  
  # Skip the index file itself
  if [ "$filename" != "index" ]; then
    # Check if the file has any named exports (not just a default export)
    if grep -q "export " "$file" | grep -v "export default"; then
      # If the file is directly in src, use simple path
      if [ "$dir_path" = "." ]; then
        echo "export * from './$filename';" >> $TMP_INDEX
      else
        # For nested files, create the import path
        echo "export * from './$dir_path/$filename';" >> $TMP_INDEX
      fi
    fi
  fi
done

echo "" >> $TMP_INDEX

# Then, export default classes
echo "// Export default classes" >> $TMP_INDEX
for file in $FILES; do
  # Extract the relative path from src
  rel_path=${file#src/}
  # Extract the directory path if any
  dir_path=$(dirname "$rel_path")
  # Extract the filename without extension
  filename=$(basename "$rel_path" .ts)
  
  # Skip the index file itself
  if [ "$filename" != "index" ]; then
    # Check if the file has a default export
    if grep -q "export default" "$file"; then
      # Use the filename with first letter capitalized and replace dots with underscores
      capitalized=$(echo "$filename" | awk '{print toupper(substr($0,1,1)) substr($0,2)}' | sed 's/\./_/g')
      
      # If the file is directly in src, use simple path
      if [ "$dir_path" = "." ]; then
        echo "export { default as $capitalized } from './$filename';" >> $TMP_INDEX
      else
        # For nested files, export with the simple name (without directory prefix)
        # This avoids the redundant naming like Router.Router
        echo "export { default as $capitalized } from './$dir_path/$filename';" >> $TMP_INDEX
      fi
    fi
  fi
done

echo "" >> $TMP_INDEX

# Dynamically find and re-export constants and enums for backward compatibility
echo "// Re-export specific items for backward compatibility" >> $TMP_INDEX

# Process each file once to extract both constants and enums
for file in $FILES; do
  # Extract the relative path from src
  rel_path=${file#src/}
  # Extract the directory path if any
  dir_path=$(dirname "$rel_path")
  # Extract the filename without extension
  filename=$(basename "$rel_path" .ts)
  
  # Skip the index file itself
  if [ "$filename" != "index" ]; then
    # Use grep with -E to combine patterns and reduce file reads
    exports=$(grep -E "export (const|enum) [A-Z][A-Z0-9_]*" "$file" | sed -E 's/export (const|enum) ([A-Z][A-Z0-9_]*).*/\2/')
    
    if [ ! -z "$exports" ]; then
      # Create a comma-separated list of exports
      exports_list=$(echo "$exports" | tr '\n' ',' | sed 's/,$//')
      
      # If the file is directly in src, use simple path
      if [ "$dir_path" = "." ]; then
        echo "export { $exports_list } from './$filename';" >> $TMP_INDEX
      else
        # For nested files, create the import path
        echo "export { $exports_list } from './$dir_path/$filename';" >> $TMP_INDEX
      fi
    fi
  fi
done

# Now, create individual subdirectory index files for direct imports from subdirectories
echo "" >> $TMP_INDEX

# Find all subdirectories in src in a single command
SUBDIRS=$(find src -type d -not -path "src" -not -path "src/__tests__*" | sort)

# Create an array to store subdirectory names for package.json update
SUBDIR_NAMES=()

for subdir in $SUBDIRS; do
  # Get the directory name relative to src
  rel_dir=${subdir#src/}
  
  # Check if there are any TypeScript files in this directory
  SUBDIR_FILES=$(find "$subdir" -maxdepth 1 -name "*.ts" -not -name "*.test.ts" -not -name "index.ts")
  
  if [ -n "$SUBDIR_FILES" ]; then
    # Add to the array for package.json update
    SUBDIR_NAMES+=("$rel_dir")
    
    # Create a barrel file for this subdirectory
    SUBDIR_INDEX="${subdir}/index.ts"
    
    # Create the subdirectory index file in one go
    cat > $SUBDIR_INDEX << EOL
// This file is auto-generated by scripts/generate-indexes.sh
// Do not edit this file directly

EOL
    
    # Export all modules from this directory
    for file in $SUBDIR_FILES; do
      filename=$(basename "$file" .ts)
      
      # Export all named exports
      echo "export * from './$filename';" >> $SUBDIR_INDEX
      
      # Check if the file has a default export and export it with a specific name
      if grep -q "export default" "$file"; then
        # Replace dots with underscores in the capitalized name
        capitalized=$(echo "$filename" | awk '{print toupper(substr($0,1,1)) substr($0,2)}' | sed 's/\./_/g')
        echo "export { default as $capitalized } from './$filename';" >> $SUBDIR_INDEX
      fi
    done
  fi
done

# Move the temporary file to the final location
cat $TMP_INDEX >> $INDEX_FILE
rm $TMP_INDEX

# Update package.json with subdirectory exports
if command -v jq &> /dev/null; then
  echo "Updating package.json with subdirectory exports..."
  
  # Create a JSON object for exports directly using jq
  EXPORTS_JSON="{\".\":{\"types\":\"./dist/index.d.ts\",\"default\":\"./dist/index.js\"}"
  
  # Add each subdirectory export
  for dir in "${SUBDIR_NAMES[@]}"; do
    EXPORTS_JSON="$EXPORTS_JSON,\"./$dir\":{\"types\":\"./dist/$dir/index.d.ts\",\"default\":\"./dist/$dir/index.js\"}"
  done
  
  # Close the JSON object
  EXPORTS_JSON="$EXPORTS_JSON}"
  
  # Create a JSON object for typesVersions directly using jq
  TYPES_JSON="{\"*\":{"
  
  # Add each subdirectory type
  for i in "${!SUBDIR_NAMES[@]}"; do
    dir="${SUBDIR_NAMES[$i]}"
    if [ $i -eq 0 ]; then
      TYPES_JSON="$TYPES_JSON\"$dir\":[\"./dist/$dir/index.d.ts\"]"
    else
      TYPES_JSON="$TYPES_JSON,\"$dir\":[\"./dist/$dir/index.d.ts\"]"
    fi
  done
  
  # Close the JSON objects
  TYPES_JSON="$TYPES_JSON}}"
  
  # Update package.json with jq
  jq ".exports = $EXPORTS_JSON | .typesVersions = $TYPES_JSON" package.json > package.json.tmp
  
  # Check if jq command was successful
  if [ $? -eq 0 ]; then
    mv package.json.tmp package.json
    echo "package.json updated with subdirectory exports"
  else
    echo "Failed to update package.json"
    rm package.json.tmp
  fi
else
  echo "jq is not installed. Skipping package.json update."
  echo "Please install jq to enable automatic package.json updates."
fi

echo "Index file generated successfully at $INDEX_FILE" 