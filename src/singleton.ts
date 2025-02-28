
export type Constructor<T> = (abstract new (...args: any[]) => T) | (new (...args: any[]) => T) | ({ prototype: T } & Function);


abstract class Singleton {
	private static readonly instances = new Map<Function, Singleton>();

	protected constructor() {}

	public static GetInstance<T extends Singleton>(this: Constructor<T>): T;
	public static GetInstance<T extends Singleton, U extends ConstructorParameters<new (...args: any[]) => T>>(this: Constructor<T>, ...args: U): T;
	public static GetInstance<T extends Singleton>(this: Constructor<T>, ...args: any[]): T {
		const classReference = this;
		if (!Singleton.instances.has(classReference)) {
			Singleton.instances.set(classReference, new (classReference as any)(...args));
		}
		return Singleton.instances.get(classReference) as T;
	}

	public static GetInstanceCount(): number {
		return Singleton.instances.size;
	}
}

export default Singleton;
