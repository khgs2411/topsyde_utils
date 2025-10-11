/**
 * Re-exports of external dependencies for convenience
 *
 * This module re-exports commonly used types, classes, and decorators from
 * class-transformer and class-validator to provide a single import source
 * for projects using topsyde-utils.
 *
 * This prevents the need to separately install these dependencies in
 * consuming projects, as they're already bundled with topsyde-utils.
 */

// ============================================================================
// class-transformer exports
// ============================================================================

// Types
export type { ClassConstructor, ClassTransformOptions } from "class-transformer";

// Core transformation functions
export { instanceToPlain, plainToInstance } from "class-transformer";

// Decorators
export { Expose } from "class-transformer";

// ============================================================================
// class-validator exports
// ============================================================================

// Types and Classes
export { ValidationError } from "class-validator";

// Validation function
export { validateSync } from "class-validator";

// Property decorators
export {
	IsArray,
	IsBoolean,
	IsDate,
	IsEnum,
	IsNumber,
	IsObject,
	IsOptional,
	IsString,
	Validate,
	IsAlphanumeric,
	IsBooleanString,
	IsDateString,
	IsDecimal,
	IsDefined,
	IsNumberString,
	IsNotEmpty,
	IsNotEmptyObject,
} from "class-validator";
