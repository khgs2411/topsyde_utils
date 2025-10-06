import type { ClassConstructor, ClassTransformOptions } from "class-transformer";
import { instanceToPlain, plainToInstance } from "class-transformer";
import Guards from "./Guards";
import { ValidationError, validateSync } from "class-validator";

/**
 * Base typesafe class for Data Transfer Objects (DTOs)
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
	public static Create<T extends Dto>(cls: ClassConstructor<T>, data: Record<string, unknown>, options: ClassTransformOptions = {}): T {
		const instance = plainToInstance(cls, data, {
			...Dto.defaultTransformOptions,
			...options,
		});

		return instance;
	}

	/**
	 * Creates an array of DTOs from an array of plain objects
	 * @param cls - The class constructor to create instances from
	 * @param dataArray - Array of data to create DTOs from
	 * @param options - Class transformer options for controlling exposure and transformation
	 * @returns Array of DTO instances
	 */
	public static CreateMany<T extends Dto>(cls: ClassConstructor<T>, dataArray: Record<string, unknown>[], options: ClassTransformOptions = {}): T[] {
		return dataArray.map((data) => Dto.Create(cls, data, options));
	}
}
