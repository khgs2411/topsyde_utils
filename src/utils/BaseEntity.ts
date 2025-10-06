import { ClassConstructor, instanceToPlain, plainToInstance } from "class-transformer";
import { validateSync, type ValidationError } from "class-validator";
import { Dto } from "./BaseDto";

export default abstract class BaseEntity {
	/**
	 * Converts entity to plain object
	 */
	public toJSON<T = Record<string, unknown>>(): T {
		return instanceToPlain(this) as T;
	}

	/**
	 * Abstract method - entities must define how to convert to DTO
	 */
	public abstract toDto(): Dto;

	/**
	 * Creates a new entity instance from DTO with validation
	 * @param cls - Entity class constructor
	 * @param dto - DTO to create entity from
	 * @param validate - Whether to validate after creation (default: true)
	 */
	static fromDto<T extends BaseEntity>(cls: ClassConstructor<T>, dto: Dto): T {
		const instance = plainToInstance(cls, dto.toJSON());
		return instance;
	}

	/**
	 * Creates multiple entities from DTOs
	 */
	static fromDtos<T extends BaseEntity>(cls: ClassConstructor<T>, dtos: Dto[]): T[] {
		return dtos.map((dto) => BaseEntity.fromDto(cls, dto));
	}

	/**
	 * Updates entity with partial data (immutable - returns new instance)
	 * @param data - Partial data to update
	 * @param validate - Whether to validate after update (default: true)
	 */
	public update<T extends BaseEntity>(this: T, data: Partial<T>, validate: boolean = true): T {
		const updated = Object.assign(Object.create(Object.getPrototypeOf(this)), this, data);

		if (validate) {
			updated.validate();
		}

		return updated;
	}
}
