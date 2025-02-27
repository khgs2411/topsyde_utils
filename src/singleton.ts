/**
 * Type representing a constructor function or class type
 */
export type Constructor<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T) | ({ prototype: T } & Function);

/**
 * Interface for singleton classes, providing type-safe instance management
 */
export type ISingletonConstructor<T extends Singleton = Singleton> = Constructor<T> & {
	GetInstance<U extends T>(): U;
	GetInstance<U extends T>(...args: ConstructorParameters<new (...args: any[]) => U>): U;
};

/**
 * Base class for implementing the singleton pattern with type-safe instance management.
 * Supports constructors with any number of arguments.
 *
 * @example
 * // No constructor arguments
 * class DatabaseExample extends Singleton {
 *     private constructor() { super(); }
 *     public static async Connection() {
 *         return this.GetInstance();
 *     }
 * }
 *
 * @example
 * // With constructor arguments
 * class EncryptionServiceExample extends Singleton {
 *     private constructor(key: string, algorithm: string) { super(); }
 *     public static Create(key: string, algorithm: string) {
 *         return this.GetInstance(key, algorithm);
 *     }
 * }
 */
abstract class Singleton {
	private static readonly instances = new Map<Function, Singleton>();

	protected constructor() {}

	public static GetInstance<T extends Singleton>(this: Constructor<T>): T;
	public static GetInstance<T extends Singleton>(this: Constructor<T>, ...args: ConstructorParameters<new (...args: any[]) => T>): T;
	public static GetInstance<T extends Singleton>(this: Constructor<T>, ...args: any[]): T {
		const classReference = this;
		if (!Singleton.instances.has(classReference)) {
			Singleton.instances.set(classReference, new (classReference as any)(...args));
		}
		return Singleton.instances.get(classReference) as T;
	}
}

export default Singleton;
