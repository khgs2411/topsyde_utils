# topsyde-utils

A comprehensive bundle of TypeScript utility classes and functions designed to simplify common programming tasks.

## Installation

```bash
npm install topsyde-utils
# or
yarn add topsyde-utils
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

### Using Modules from Subdirectories

The package organizes related functionality into modules. For example, the router module:

```typescript
// Import the entire Router module
import { Router } from 'topsyde-utils';

// Create a new router
const router = new Router.Router();

// Add a route
router.addRoute(new Router.Route('/users', 'GET', async (req, res) => {
  // Handle request
}));

// Use middleware
Router.applyMiddleware(req, res, [
  Router.commonMiddleware.logger,
  Router.commonMiddleware.cors
]);
```

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
npm run generate-indexes
```

To build the package with the updated indexes:

```bash
npm run build:indexes
```

#### Naming Conventions

- Default exports from files directly in src are exported with their capitalized name (e.g., `app.ts` → `App`)
- Default exports from files in subdirectories are exported with the directory name as a prefix (e.g., `router/route.ts` → `RouterRoute`)
- Subdirectories are exported as modules with the capitalized directory name (e.g., `router/` → `Router`)

## License

MIT
