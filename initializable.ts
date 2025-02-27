class Initializable {
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
