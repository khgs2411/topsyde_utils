/* class Initializable {
	retries: number;
	initialized: boolean;
	constructor(retries: number = 25) {
		this.retries = retries;
		this.initialized = false;
		this.initialize();
	}

	protected initialize() {
		this.initialized = true;
	}

	protected async isInitialized(): Promise<boolean> {
		let retries = this.retries; // 5 seconds / 200ms = 25 retries

		while (!this.initialized && retries > 0) {
			await new Promise((resolve) => setTimeout(resolve, 200));
			retries--;
		}

		if (!this.initialized) {
			throw new Error("Initialization failed after 5 seconds");
		}

		return true;
	}
}

export default Initializable;
 */

/**
 * Configuration options for initialization
 */
export interface InitializableOptions {
	/** Number of retry attempts (default: 25) */
	retries?: number;

	/** Time in milliseconds between retry attempts (default: 200) */
	retryInterval?: number;

	/** Whether to initialize automatically in constructor (default: false) */
	autoInitialize?: boolean;

	/** Custom timeout in milliseconds (overrides retries * retryInterval) */
	timeout?: number;
}

/**
 * Events emitted by Initializable instances
 */
export type InitializableEvent = "initializing" | "initialized" | "failed" | "timeout";

/**
 * Base class for objects that require asynchronous initialization
 *
 * @example
 * class Database extends Initializable {
 *   private connection: any;
 *
 *   constructor() {
 *     super({ retries: 10, retryInterval: 500 });
 *   }
 *
 *   protected async doInitialize(): Promise<void> {
 *     this.connection = await connectToDatabase();
 *   }
 * }
 *
 * // Usage
 * const db = new Database();
 * await db.initialize();
 * // or check status
 * if (await db.isInitialized()) {
 *   // use the database
 * }
 */
class Initializable {
	/** Number of retry attempts */
	private retries: number;

	/** Time in milliseconds between retry attempts */
	private retryInterval: number;

	/** Whether initialization has completed successfully */
	private _initialized: boolean = false;

	/** Whether initialization is in progress */
	private initializing: boolean = false;

	/** Whether initialization has failed */
	private failed: boolean = false;

	/** Optional timeout in milliseconds */
	private timeout?: number;

	/** Event listeners */
	private listeners: Map<InitializableEvent, Function[]> = new Map();

	/** Abort controller for cancellation */
	private abortController: AbortController | null = null;

	/**
	 * Creates a new Initializable instance
	 * @param options Configuration options
	 */
	constructor(options: InitializableOptions = {}) {
		this.retries = options.retries ?? 25;
		this.retryInterval = options.retryInterval ?? 200;
		this.timeout = options.timeout;

		if (options.autoInitialize) {
			// Schedule initialization on next tick to allow subclass construction to complete
			setTimeout(() => this.initialize(), 0);
		}
	}

	/**
	 * Initialize the object
	 * @returns Promise that resolves when initialization is complete
	 * @throws Error if initialization fails
	 */
	public async initialize(): Promise<void> {
		// If already initialized, return immediately
		if (this._initialized) {
			return;
		}

		// If already initializing, wait for it to complete
		if (this.initializing) {
			return this.waitForInitialization();
		}

		// Start initialization
		this.initializing = true;
		this.failed = false;
		this.abortController = new AbortController();

		try {
			// Emit initializing event
			this.emit("initializing");

			// Call the implementation-specific initialization
			await this.doInitialize();

			// Mark as initialized
			this._initialized = true;
			this.initializing = false;

			// Emit initialized event
			this.emit("initialized");
		} catch (error) {
			// Mark as failed
			this.failed = true;
			this.initializing = false;

			// Emit failed event
			this.emit("failed", error);

			// Re-throw the error
			throw error instanceof Error ? error : new Error(`Initialization failed: ${String(error)}`);
		} finally {
			this.abortController = null;
		}
	}

	/**
	 * Implementation-specific initialization logic
	 * Override this method in subclasses to provide custom initialization
	 */
	protected async doInitialize(): Promise<void> {
		// Default implementation does nothing
		// Subclasses should override this method
		this._initialized = true;
	}

	/**
	 * Check if the object is initialized
	 * @param waitForIt Whether to wait for initialization to complete
	 * @returns Promise that resolves to true if initialized, false otherwise
	 */
	public async isInitialized(waitForIt: boolean = false): Promise<boolean> {
		// If already initialized, return immediately
		if (this._initialized) {
			return true;
		}

		// If not waiting or already failed, return current status
		if (!waitForIt || this.failed) {
			return this._initialized;
		}

		// Wait for initialization to complete
		try {
			await this.waitForInitialization();
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Wait for initialization to complete
	 * @returns Promise that resolves when initialization is complete
	 * @throws Error if initialization fails or times out
	 */
	private async waitForInitialization(): Promise<void> {
		// If already initialized, return immediately
		if (this._initialized) {
			return;
		}

		// If not initializing, start initialization
		if (!this.initializing) {
			return this.initialize();
		}

		const className = this.constructor.name;
		const maxTime = this.timeout ?? this.retries * this.retryInterval;
		let retries = this.retries;

		// Create a promise that resolves when initialization completes
		return new Promise<void>((resolve, reject) => {
			// One-time event listeners for completion
			const onInitialized = () => {
				this.off("initialized", onInitialized);
				this.off("failed", onFailed);
				this.off("timeout", onTimeout);
				resolve();
			};

			const onFailed = (error: Error) => {
				this.off("initialized", onInitialized);
				this.off("failed", onFailed);
				this.off("timeout", onTimeout);
				reject(error);
			};

			const onTimeout = () => {
				this.off("initialized", onInitialized);
				this.off("failed", onFailed);
				this.off("timeout", onTimeout);
				reject(new Error(`Initialization of ${className} timed out after ${maxTime}ms`));
			};

			// Register event listeners
			this.on("initialized", onInitialized);
			this.on("failed", onFailed);
			this.on("timeout", onTimeout);

			// Set up polling to check for timeout
			const checkInterval = setInterval(() => {
				retries--;

				if (this._initialized) {
					clearInterval(checkInterval);
					// Will be handled by event
				} else if (retries <= 0) {
					clearInterval(checkInterval);
					this.emit("timeout");
				}
			}, this.retryInterval);
		});
	}

	/**
	 * Cancel initialization if in progress
	 */
	public cancel(): void {
		if (this.initializing && this.abortController) {
			this.abortController.abort();
			this.initializing = false;
			this.failed = true;
			this.emit("failed", new Error("Initialization cancelled"));
		}
	}

	/**
	 * Reset initialization state
	 * Allows re-initialization after failure
	 */
	public reset(): void {
		if (this.initializing) {
			this.cancel();
		}

		this._initialized = false;
		this.initializing = false;
		this.failed = false;
	}

	/**
	 * Register an event listener
	 * @param event Event name
	 * @param callback Function to call when event is emitted
	 * @returns this for chaining
	 */
	public on(event: InitializableEvent, callback: Function): this {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}

		this.listeners.get(event)!.push(callback);
		return this;
	}

	/**
	 * Remove an event listener
	 * @param event Event name
	 * @param callback Function to remove
	 * @returns this for chaining
	 */
	public off(event: InitializableEvent, callback: Function): this {
		if (this.listeners.has(event)) {
			const callbacks = this.listeners.get(event)!;
			const index = callbacks.indexOf(callback);

			if (index !== -1) {
				callbacks.splice(index, 1);
			}
		}

		return this;
	}

	/**
	 * Emit an event
	 * @param event Event name
	 * @param args Arguments to pass to listeners
	 */
	protected emit(event: InitializableEvent, ...args: any[]): void {
		if (this.listeners.has(event)) {
			const callbacks = [...this.listeners.get(event)!];
			callbacks.forEach((callback) => {
				try {
					callback(...args);
				} catch (error) {
					console.error(`Error in ${event} event listener:`, error);
				}
			});
		}
	}

	/**
	 * Get the abort signal for cancellation
	 * Can be passed to fetch or other cancellable operations
	 */
	protected get abortSignal(): AbortSignal | undefined {
		return this.abortController?.signal;
	}

	/**
	 * Check if initialization has been completed
	 */
	public get initialized(): boolean {
		return this._initialized;
	}

	/**
	 * Check if initialization is in progress
	 */
	public get isInitializing(): boolean {
		return this.initializing;
	}

	/**
	 * Check if initialization has failed
	 */
	public get hasFailed(): boolean {
		return this.failed;
	}
}

export default Initializable;
