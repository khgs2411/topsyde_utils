import { ClassConstructor, instanceToPlain, plainToInstance } from "class-transformer";
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
	 * Updates entity with partial data (immutable - returns new instance)
	 * @param data - Partial data to update
	 * @param validate - Whether to validate after update (default: true)
	 */
	public update<T extends BaseEntity>(this: T, data: Partial<T>): T {
		const updated = Object.assign(Object.create(Object.getPrototypeOf(this)), this, data);
		return updated;
	}

	/**
	 * Creates a new entity instance from DTO (infers class from `this`)
	 *
	 * NOTE: This is a BASE implementation that uses plainToInstance.
	 * Derived classes should override if they need custom construction logic.
	 *
	 * @param dto - DTO to create entity from
	 */
	public static FromDto<T extends BaseEntity>(this: ClassConstructor<T>, dto: Dto): T {
		const instance = plainToInstance(this, dto.toJSON());
		return instance;
	}

	/**
	 * Creates multiple entities from DTOs
	 */
	public static FromDtos<T extends BaseEntity>(this: ClassConstructor<T>, dtos: Dto[]): T[] {
		return plainToInstance(
			this,
			dtos.map((dto) => dto.toJSON()),
		);
	}
}
