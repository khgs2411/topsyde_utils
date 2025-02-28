export type Constructor<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T) | ({ prototype: T } & Function);

abstract class Singleton {
	// Store instances by class
	private static readonly instances = new Map<Function, Singleton>();
	
	// Flag to determine if a class should share instances with its base class
	private static readonly shareInstances = new Map<Function, boolean>();

	protected constructor() {}

	/**
	 * Configure a class to share instances with its base class
	 * @param classRef The class to configure
	 * @param share Whether to share instances with the base class (default: true)
	 */
	public static ShareInstanceWithBaseClass<T extends Singleton>(classRef: Constructor<T>, share: boolean = true): void {
		Singleton.shareInstances.set(classRef, share);
	}

	/**
	 * Get the instance for a class, respecting the sharing configuration
	 */
	public static GetInstance<T extends Singleton>(this: Constructor<T>, ...args: any[]): T {
		const classReference = this;
		
		// Check if this class should share instances
		const shouldShare = Singleton.shareInstances.get(classReference) === true;
		
		// If we already have an instance for this class, return it
		if (Singleton.instances.has(classReference)) {
			return Singleton.instances.get(classReference) as T;
		}

		// No existing instance found, create a new one
		const instance = new (classReference as any)(...args);
		Singleton.instances.set(classReference, instance);

		return instance as T;
	}

	public static GetInstanceCount(): number {
		return Singleton.instances.size;
	}
}

export default Singleton;
