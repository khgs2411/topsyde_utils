import type { ClassConstructor, ClassTransformOptions } from "class-transformer";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { validateSync, type ValidationError } from "class-validator";
import "reflect-metadata";
import Guards from "./Guards";

/**
 * Base class for Data Transfer Objects (DTOs)
 * Provides validation, transformation, and type safety for DTOs
 */
export abstract class Dto {
	/**
	 * Default options for class transformation
	 */
	protected static readonly defaultTransformOptions: ClassTransformOptions = {
		excludeExtraneousValues: true,
		enableCircularCheck: true,
		exposeDefaultValues: true,
		enableImplicitConversion: false, // Safer default, especially when using class-validator
	};

	/**
	 * Validates the DTO instance
	 * @throws ValidationError[] if validation fails
	 */
	public validate(): ValidationError[] {
		const errors = validateSync(this, {
			validationError: { target: false },
			forbidUnknownValues: true,
		});

		if (errors.length > 0) {
			throw errors;
		}

		return errors;
	}

	/**
	 * Converts the DTO to a plain object
	 * @param options - Class transformer options for controlling exposure and transformation
	 * @returns Plain object representation of the DTO
	 */
	public toJSON<T = Record<string, unknown>>(include_undefined: boolean = true, options?: ClassTransformOptions): T {
		const value = instanceToPlain(this, {
			...Dto.defaultTransformOptions,
			...options,
		}) as T;

		if (!include_undefined) {
			return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([_, v]) => !Guards.IsNil(v))) as T;
		}

		return value;
	}

	/**
	 * Creates a new instance of the DTO with validation
	 * @param cls - The class constructor to create an instance from
	 * @param data - Data to create the DTO from
	 * @param options - Class transformer options for controlling exposure and transformation
	 * @returns New instance of the DTO
	 * @throws ValidationError[] if validation fails and validate is true
	 */
	static create<T extends Dto>(cls: ClassConstructor<T>, data: Record<string, unknown>, options: ClassTransformOptions & { validate?: boolean } = {}): T {
		const { validate = true, ...transformOptions } = options;

		const instance = plainToInstance(cls, data, {
			...Dto.defaultTransformOptions,
			...transformOptions,
		});

		if (validate) {
			instance.validate();
		}

		return instance;
	}

	/**
	 * Creates a new instance of the DTO without validation
	 * @param cls - The class constructor to create an instance from
	 * @param data - Partial data to create the DTO from
	 * @param options - Class transformer options for controlling exposure and transformation
	 * @returns New instance of the DTO
	 */
	static createPartial<T extends Dto>(cls: ClassConstructor<T>, data: Partial<Record<string, unknown>>, options: ClassTransformOptions = {}): T {
		return Dto.create(cls, data as Record<string, unknown>, {
			...options,
			validate: false,
		});
	}

	/**
	 * Creates an array of DTOs from an array of plain objects
	 * @param cls - The class constructor to create instances from
	 * @param dataArray - Array of data to create DTOs from
	 * @param options - Class transformer options for controlling exposure and transformation
	 * @returns Array of DTO instances
	 */
	static createMany<T extends Dto>(
		cls: ClassConstructor<T>,
		dataArray: Record<string, unknown>[],
		options: ClassTransformOptions & { validate?: boolean } = {},
	): T[] {
		return dataArray.map((data) => Dto.create(cls, data, options));
	}

	/**
	 * Merges partial data into the DTO instance and validates it.
	 * @param data - Partial data to merge into the DTO.
	 * @param options - Class transformer options for controlling exposure and transformation.
	 * @throws ValidationError[] if validation fails.
	 */
	public merge<T extends Dto>(this: T, data: Partial<Record<keyof T, any>>, options?: ClassTransformOptions): T {
		const { validate = true, ...transformOptions } = { validate: true, ...options };

		// Iterate over the keys of the input data and assign them to the current instance
		for (const key in data) {
			if (Object.prototype.hasOwnProperty.call(data, key)) {
				// We need to be careful with 'any' here, but it's a common pattern in such utility functions.
				// The validation step will catch type mismatches if validators are set up correctly.
				(this as any)[key] = data[key as keyof T];
			}
		}

		// If extraneous values are not allowed, we might need to handle them here,
		// but class-transformer's plainToInstance usually handles this with excludeExtraneousValues.
		// However, since we are manually assigning, we rely on the user providing valid partial data.

		// We might still want to apply transformations for consistency,
		// especially if there are @Transform decorators.
		// Convert to plain, then back to instance, but only assign the merged values.
		// This is tricky without re-introducing the original problem.
		// A simpler approach is to directly assign and rely on validation.

		if (validate) {
			this.validate();
		}

		return this;
	}
}
