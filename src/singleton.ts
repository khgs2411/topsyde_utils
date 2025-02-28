export type Constructor<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T) | ({ prototype: T } & Function);

abstract class Singleton {
	// Store instances by class
	private static readonly instances = new Map<Function, Singleton>();

	protected constructor() {}

	public static GetInstance<T extends Singleton>(this: Constructor<T>, ...args: any[]): T {
		const classReference = this;
		
		// If we already have an instance for this exact class, return it
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
