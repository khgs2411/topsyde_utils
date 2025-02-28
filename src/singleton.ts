export default abstract class Singleton {
	private static readonly _instances = new Map<string, Singleton>();

	protected timestamp: Date;

	protected constructor() {
		this.timestamp = new Date();
	}

	public static GetInstance<T extends Singleton, Args extends any[] = ConstructorParameters<new (...args: any[]) => T>>(...args: Args): T {
		const className = this.name;
		const key = className.includes("Websocket") ? "Websocket" : className;
		
		if (!Singleton._instances.has(key)) {
			const instance = Reflect.construct(this, args) as T;
			Singleton._instances.set(key, instance);
		}
		
		return Singleton._instances.get(key) as T;
	}
	
	public static ResetInstances(): void {
		Singleton._instances.clear();
	}
	
	
	public static ResetInstance(className: string): void {
		Singleton._instances.delete(className);
	}
}
