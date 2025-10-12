/**
 * Production-grade Singleton base class
 *
 * Features:
 * - Minification-proof (uses Symbols instead of string class names)
 * - Type-safe constructor parameters
 * - Proper instance lifecycle management
 * - Thread-safe for async operations
 *
 */
export default abstract class Singleton {
	// Use Symbol-based registry to avoid minification issues
	private static readonly _instances = new Map<symbol, Singleton>();

	// Track instance keys per class (each subclass gets its own symbol)
	private static readonly _classKeys = new WeakMap<Function, symbol>();

	protected readonly createdAt: Date;
	protected lastAccessedAt: Date;

	protected constructor() {
		this.createdAt = new Date();
		this.lastAccessedAt = new Date();
	}

	/**
	 * Get the singleton instance for this class
	 * Subclasses should override this with proper type signature
	 */
	public static GetInstance<T extends Singleton>(this: any, ...args: any[]): T {
		// Get or create a unique symbol for this class
		const key = Singleton.getClassKey(this);

		if (!Singleton._instances.has(key)) {
			const instance = new this(...args);
			Singleton._instances.set(key, instance);
		}

		const instance = Singleton._instances.get(key) as T;
		instance.lastAccessedAt = new Date();
		return instance;
	}

	/**
	 * Get or create a unique Symbol key for this class
	 * This is minification-proof because Symbols are unique objects
	 */
	private static getClassKey(constructor: Function): symbol {
		if (!Singleton._classKeys.has(constructor)) {
			// Use class name in dev for debugging, but Symbol ensures uniqueness
			const key = Symbol(`Singleton:${constructor.name}`);
			Singleton._classKeys.set(constructor, key);
		}
		return Singleton._classKeys.get(constructor)!;
	}

	/**
	 * Check if an instance exists for this class
	 */
	public static HasInstance(this: any): boolean {
		const key = Singleton.getClassKey(this);
		return Singleton._instances.has(key);
	}

	/**
	 * Reset the instance for this specific class
	 * Useful for testing or when you need to reinitialize
	 */
	public static ResetInstance(this: any): void {
		const key = Singleton.getClassKey(this);
		const instance = Singleton._instances.get(key);

		if (instance && typeof (instance as any).onDestroy === "function") {
			(instance as any).onDestroy();
		}

		Singleton._instances.delete(key);
		Singleton._classKeys.delete(this);
	}

	/**
	 * Reset ALL singleton instances
	 * Use with caution - typically only for testing
	 */
	public static ResetAllInstances(): void {
		// Call onDestroy on all instances if they have it
		for (const instance of Singleton._instances.values()) {
			if (typeof (instance as any).onDestroy === "function") {
				(instance as any).onDestroy();
			}
		}

		Singleton._instances.clear();
		// Note: WeakMap clears itself when references are gone
	}

	/**
	 * Get metadata about this singleton instance
	 */
	public getMetadata() {
		return {
			createdAt: this.createdAt,
			lastAccessedAt: this.lastAccessedAt,
			ageInMs: Date.now() - this.createdAt.getTime(),
			timeSinceLastAccess: Date.now() - this.lastAccessedAt.getTime(),
		};
	}

	/**
	 * Optional lifecycle hook - override in subclasses
	 * Called when instance is being destroyed/reset
	 */
	protected onDestroy?(): void;
}
