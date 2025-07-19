import Singleton from "../../singleton";

abstract class Database extends Singleton {
	constructor() {
		super();
	}

	public abstract connect(): Promise<void>;
	public abstract disconnect(): Promise<void>;

	protected connected: boolean = false;
	protected processing: boolean = false;

	public static async Connection<T extends (new (...args: any[]) => Database) & typeof Singleton>(
		this: T,
		...args: ConstructorParameters<T>
	): Promise<InstanceType<T>> {
		try {
			const instance = this.GetInstance(...args) as InstanceType<T>;
			if (!instance.connected && !instance.processing) {
				await instance.connect();
			}
			return instance;
		} catch (e) {
			console.error(e);
			throw e;
		}
	}
}

export default Database;
