/**
 * Base class for implementing the singleton pattern with type-safe instance management.
 * Supports constructors with any number of arguments.
 *
 * @example
 * // No constructor arguments
 * class DatabaseExample extends Singleton {
 *     protected constructor() { super(); }
 *     public static connect() {
 *         return DatabaseExample.GetInstance();
 *     }
 * }
 *
 * @example
 * // With constructor arguments
 * class EncryptionServiceExample extends Singleton {
 *     protected constructor(key: string, algorithm: string) { super(); }
 *     public static create(key: string, algorithm: string) {
 *         return EncryptionServiceExample.GetInstance(key, algorithm);
 *     }
 * }
 *
 * @example
 * // Lazy initialization with factory function
 * class ConfigService extends Singleton {
 *     protected constructor(configPath: string) {
 *         super();
 *         // Heavy initialization work
 *     }
 *
 *     public static createLazy(configPath: string) {
 *         return ConfigService.CreateFactory(configPath);
 *     }
 * }
 */
abstract class Singleton {
	// Using WeakMap allows garbage collection when no references remain to the class
	private static readonly instances = new WeakMap<Function, Singleton>();

	// Lock to prevent concurrent initialization in worker environments
	private static readonly initializationLocks = new WeakMap<Function, boolean>();

	// Track active instances for debugging and testing
	private static readonly activeInstances: Map<string, Function> = new Map();

	/**
	 * Protected constructor to prevent direct instantiation
	 */
	protected constructor() {
		// Ensure the constructor is only called from getInstance
	}

	/**
	 * Gets the singleton instance of the class
	 * Creates a new instance if one doesn't exist
	 * @throws Error if concurrent initialization is detected
	 */
	public static GetInstance<T extends Singleton>(...args: any[]): T {
		const classReference = this as any;

		// Fast path: return existing instance if available
		if (Singleton.instances.has(classReference)) {
			return Singleton.instances.get(classReference) as T;
		}

		// Protection for worker thread environments
		if (Singleton.initializationLocks.get(classReference)) {
			throw new Error(`Concurrent initialization of ${classReference.name} singleton detected`);
		}

		try {
			Singleton.initializationLocks.set(classReference, true);

			// Double-check pattern to handle race conditions
			if (!Singleton.instances.has(classReference)) {
				const instance = new classReference(...args);
				Singleton.instances.set(classReference, instance);
				// Track the instance for debugging
				Singleton.activeInstances.set(classReference.name, classReference);
			}

			return Singleton.instances.get(classReference) as T;
		} catch (error) {
			throw new Error(`Failed to initialize ${classReference.name} singleton: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			Singleton.initializationLocks.delete(classReference);
		}
	}

	/**
	 * Checks if an instance already exists
	 */
	protected static HasInstance(): boolean {
		return Singleton.instances.has(this as any);
	}

	/**
	 * Clears the instance (useful for testing or resource cleanup)
	 * @returns true if an instance was cleared, false if no instance existed
	 */
	protected static ClearInstance(): boolean {
		const hadInstance = Singleton.instances.has(this as any);
		Singleton.instances.delete(this as any);
		Singleton.activeInstances.delete((this as any).name);
		return hadInstance;
	}

	/**
	 * Creates a factory function for lazy initialization
	 */
	protected static CreateFactory<T extends Singleton>(...args: any[]): () => T {
		const classReference = this as any;
		return () => classReference.GetInstance(...args);
	}

	/**
	 * Clears all singleton instances
	 * Primarily used for testing or application shutdown
	 */
	public static ClearAllInstances(): void {
		const instanceCount = Singleton.GetInstanceCount();

		// Clear the WeakMap by removing all references
		Singleton.activeInstances.forEach((constructor) => {
			Singleton.instances.delete(constructor);
		});

		// Clear the tracking map
		Singleton.activeInstances.clear();

		console.log(`Cleared ${instanceCount} singleton instances`);
	}

	/**
	 * Gets the count of active singleton instances
	 * Useful for debugging and testing
	 */
	public static GetInstanceCount(): number {
		return Singleton.activeInstances.size;
	}

	/**
	 * Gets the list of active singleton class names
	 * Useful for debugging and testing
	 */
	public static GetActiveInstanceNames(): string[] {
		return Array.from(Singleton.activeInstances.keys());
	}
}

export default Singleton;
