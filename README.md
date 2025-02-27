# topsyde-utils

A comprehensive bundle of TypeScript utility classes and functions designed to simplify common programming tasks.

## Installation

```bash
npm install topsyde-utils
# or
yarn add topsyde-utils
# or
bun add topsyde-utils
```

## Features

- **Error Handling**: Custom error classes like `Throwable` for expected errors that shouldn't trigger retries
- **Type Guards**: Robust type checking with the `Guards` class
- **Utility Functions**: Extensive collection of helper functions in the `Lib` class
- **Singleton Pattern**: Easy implementation of the singleton pattern
- **Application Utilities**: Response formatting for web applications
- **Type Definitions**: Useful TypeScript type definitions

## Usage Examples

### Throwable Error Handling

```typescript
import { Throwable, Lib } from 'topsyde-utils';

// Basic usage
throw new Throwable("This operation failed but it's expected");

// With context
throw new Throwable("User not found", { 
  context: { userId: 123, operation: "fetch" } 
});

// Using with RetryHandler
await Lib.RetryHandler(async () => {
  // If this throws a Throwable, RetryHandler won't retry
  const result = await someOperation();
  if (!result) {
    throw new Throwable("Expected failure condition");
  }
  return result;
});
```

### Type Guards

```typescript
import { Guards } from 'topsyde-utils';

if (Guards.IsString(value)) {
  // value is guaranteed to be a string
  console.log(value.toUpperCase());
}

if (Guards.IsNumber(value, true)) {
  // value is guaranteed to be a non-null number
  console.log(value.toFixed(2));
}
```

### Utility Functions

```typescript
import { Lib } from 'topsyde-utils';

// Date formatting
const formattedDate = Lib.FormatDate(new Date(), "DD/MM/YYYY");

// Retry mechanism
const result = await Lib.RetryHandler(
  async () => await fetchData(),
  3 // number of retries
);

// UUID generation
const id = Lib.UUID();
```

### Singleton Pattern

```typescript
import { Singleton } from 'topsyde-utils';

class Database extends Singleton {
  connect() {
    // Connect to database
  }
}

// Get the singleton instance
const db = Database.getInstance();
db.connect();
```

### Importing from Subdirectories

The package supports two ways to import modules:

#### 1. Import from the root package

```typescript
// Import from the root package
import { Router } from 'topsyde-utils';

// Use directly without namespace
Router.SetRoutes(routes);
```

#### 2. Import directly from subdirectories

```typescript
// Import directly from a subdirectory
import { Router, Routes } from 'topsyde-utils/router';
import { Controller } from 'topsyde-utils/server';

// Use the imported classes directly
Router.SetRoutes(routes);
const controller = new Controller();
```

This approach provides more flexibility and cleaner imports, especially when you only need specific components from a subdirectory.

## API Documentation

### Throwable

Custom error class for errors that are expected to be thrown and should not trigger retry mechanisms or be reported to error monitoring services.

```typescript
new Throwable(message, options);
```

- `message`: Error message or existing Error object to wrap
- `options`: Configuration options
  - `logError`: Whether to log this error to console (default: true)
  - `context`: Additional context data to attach to the error

### Guards

Type guard utilities for safe type checking.

- `IsString(value, excludeNull?)`: Check if value is a string
- `IsNumber(value, excludeNull?)`: Check if value is a number
- `IsBoolean(value, excludeNull?)`: Check if value is a boolean
- `IsArray(value, excludeNull?)`: Check if value is an array
- `IsObject(value, excludeNull?)`: Check if value is an object
- `IsFunction(value, excludeNull?)`: Check if value is a function
- `IsNil(value)`: Check if value is null or undefined
- `IsType<T>(obj, keys?)`: Check if object matches a type

### Lib

Extensive utility library with various helper functions.

- Date/Time utilities
- Retry mechanisms
- Logging functions
- String manipulation
- UUID generation
- And many more...

## Development

### Automatic Index Generation

This package includes a script to automatically generate index files based on the contents of the src directory and its subdirectories. This makes it easier to maintain the package as you add or modify files.

The script:
1. Exports all named exports from all files
2. Exports all default exports with capitalized names
3. Creates barrel files (index.ts) for each subdirectory
4. Imports and re-exports subdirectory modules in the main index.ts

To generate the index files:

```bash
bun run generate-indexes
```

### Development Scripts

- `bun run clean` - Remove the dist directory
- `bun run format` - Format all TypeScript files with Prettier (using cache)
- `bun run format:generated` - Format only generated index files
- `bun run lint` - Lint TypeScript files with ESLint (using cache)
- `bun run test` - Run tests with Jest
- `bun run generate-indexes` - Generate index files only
- `bun run build:ts` - Compile TypeScript files
- `bun run build:types` - Generate TypeScript declaration files
- `bun run build:prepare` - Clean, generate indexes, and format generated files
- `bun run build` - Complete build process (prepare, compile, generate types)
- `bun run version:bump` - Bump version without creating git tags

### Publishing

To publish a new version of the package, use the optimized release script:

```bash
# Using the script directly
./scripts/release.sh [patch|minor|major] [tag]

# Or using npm/bun scripts
bun run release [patch|minor|major] [tag]
```

Examples:
```bash
bun run release           # Increment patch version (default)
bun run release patch     # Same as above
bun run release minor     # Increment minor version (e.g., 1.0.0 -> 1.1.0)
bun run release major     # Increment major version (e.g., 1.0.0 -> 2.0.0)
bun run release minor beta # Increment minor version with 'beta' tag
```

The release script will:
1. Calculate and display the new version number
2. Ask for confirmation before proceeding
3. Run linting to ensure code quality
4. Update the version in package.json
5. Build the package with all optimizations
6. Publish the package with the specified tag
7. Display the time taken for the release process

The script includes robust error handling and will exit on any failure, ensuring that the package is only published when all steps complete successfully.

### Testing the Release Process

You can test the release process without actually publishing to npm using these commands:

```bash
# Test the release process without building or publishing
bun run release:dry-run [patch|minor|major] [tag]

# Test the full release process including building but without publishing to npm
bun run release:test [patch|minor|major] [tag]
```

These test options are useful for:
- Verifying that the release script works correctly
- Testing the build process without affecting the npm registry
- Checking what files will be included in the published package
- Measuring the time taken for the release process

## License

MIT
