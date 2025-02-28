export default abstract class Singleton {
	private static readonly _instances = new Map<string, Singleton>();

	protected timestamp: Date;

	protected constructor() {
		this.timestamp = new Date();
	}

	public static GetInstance<T extends Singleton>(...args: any[]): T {
		const className = this.name;

		if (!Singleton._instances.has(className)) {
			const instance = Reflect.construct(this, args) as T;
			Singleton._instances.set(className, instance);
		}

		return Singleton._instances.get(className) as T;
	}

	public static ResetInstances(): void {
		Singleton._instances.clear();
	}

	public static ResetInstance(className: string): void {
		Singleton._instances.delete(className);
	}
}
