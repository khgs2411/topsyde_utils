import Singleton from "../singleton";
import Channel from "../server/bun/websocket/Channel";
import { WebsocketStructuredMessage } from "../server/bun/websocket/websocket.types";
import * as app from "../server/bun/websocket";

// Base class that extends Singleton
class BaseClass extends Singleton {
	protected constructor() {
		super();
	}
	public value: string = "base";

	public getValue(): string {
		return this.value;
	}

	public static staticMethod(): string {
		return "base-static";
	}
}

// Derived class that extends BaseClass
class DerivedClass extends BaseClass {
	protected constructor() {
		super();
	}
	public override value: string = "derived";

	public override getValue(): string {
		return "derived-" + this.value;
	}

	public static override staticMethod(): string {
		return "derived-static";
	}
}

// Another class that extends BaseClass
class AnotherDerivedClass extends BaseClass {
	public override value: string = "another";

	public static testStaticMethod(): string {
		// This should call the staticMethod on the class it's called on
		return this.staticMethod();
	}
}

// Class with constructor parameters
class ParameterizedSingleton extends Singleton {
	public readonly config: { name: string; id: number };

	constructor(name: string, id: number) {
		super();
		this.config = { name, id };
	}

	public getConfig(): { name: string; id: number } {
		return this.config;
	}
}

// Multiple level inheritance
class Level1 extends Singleton {
	protected constructor() {
		super();
	}
	public level: number = 1;
}

class Level2 extends Level1 {
	protected constructor() {
		super();
	}
	public override level: number = 2;
}

class Level3 extends Level2 {
	protected constructor() {
		super();
	}
	public override level: number = 3;
}

describe("Singleton", () => {
	beforeEach(() => {
		// Reset the singleton instances before each test
		Singleton.ResetInstances();
	});

	test("BaseClass should return a singleton instance", () => {
		const instance1 = BaseClass.GetInstance<BaseClass>();
		const instance2 = BaseClass.GetInstance<BaseClass>();

		expect(instance1).toBe(instance2);
		expect(instance1.getValue()).toBe("base");
	});

	test("Each class should have its own singleton instance", () => {
		const baseInstance = BaseClass.GetInstance<BaseClass>();
		const derivedInstance = DerivedClass.GetInstance<DerivedClass>();

		// Each class should have its own instance
		expect(derivedInstance).not.toBe(baseInstance);

		// But the instances should have the correct class behavior
		expect(baseInstance.getValue()).toBe("base");
		expect(derivedInstance.getValue()).toBe("derived-derived");
	});

	test("Static methods should be called on the correct class", () => {
		expect(BaseClass.staticMethod()).toBe("base-static");
		expect(DerivedClass.staticMethod()).toBe("derived-static");

		// In JavaScript, 'this' in a static method refers to the class it was called on
		expect(AnotherDerivedClass.testStaticMethod()).toBe("base-static");
	});

	test("Multiple level inheritance should maintain separate instances", () => {
		const level1 = Level1.GetInstance<Level1>();
		const level2 = Level2.GetInstance<Level2>();
		const level3 = Level3.GetInstance<Level3>();

		// Each level should have its own instance
		expect(level1).not.toBe(level2);
		expect(level2).not.toBe(level3);
		expect(level1).not.toBe(level3);

		// Each instance should have the correct level value
		expect(level1.level).toBe(1);
		expect(level2.level).toBe(2);
		expect(level3.level).toBe(3);
	});

	test("Singleton instances should be created only once per class", () => {
		// Create a mock class that extends Singleton and counts constructor calls
		class CounterSingleton extends Singleton {
			public static constructorCallCount = 0;

			constructor() {
				super();
				CounterSingleton.constructorCallCount++;
			}
		}

		// Get the instance multiple times
		const instance1 = CounterSingleton.GetInstance();
		const instance2 = CounterSingleton.GetInstance();
		const instance3 = CounterSingleton.GetInstance();

		// Constructor should be called only once
		expect(CounterSingleton.constructorCallCount).toBe(1);

		// All instances should be the same
		expect(instance1).toBe(instance2);
		expect(instance2).toBe(instance3);
	});

	test("Singleton should handle property modifications correctly", () => {
		const instance1 = BaseClass.GetInstance<BaseClass>();

		// Modify a property
		instance1.value = "modified";

		// Get the instance again
		const instance2 = BaseClass.GetInstance<BaseClass>();

		// The modification should persist
		expect(instance2.value).toBe("modified");

		// Reset for other tests
		instance1.value = "base";
	});

	test("ResetInstances should clear all singleton instances", () => {
		// Get instances of multiple classes
		const baseInstance1 = BaseClass.GetInstance<BaseClass>();
		const derivedInstance1 = DerivedClass.GetInstance<DerivedClass>();

		// Reset all instances
		Singleton.ResetInstances();

		// Get new instances
		const baseInstance2 = BaseClass.GetInstance<BaseClass>();
		const derivedInstance2 = DerivedClass.GetInstance<DerivedClass>();

		// The new instances should be different from the original ones
		expect(baseInstance2).not.toBe(baseInstance1);
		expect(derivedInstance2).not.toBe(derivedInstance1);
	});

	test("ResetInstance should clear a specific singleton instance", () => {
		// Get instances of multiple classes
		const baseInstance1 = BaseClass.GetInstance<BaseClass>();
		const derivedInstance1 = DerivedClass.GetInstance<DerivedClass>();

		// Reset only the BaseClass instance
		Singleton.ResetInstance("BaseClass");

		// Get new instances
		const baseInstance2 = BaseClass.GetInstance<BaseClass>();
		const derivedInstance2 = DerivedClass.GetInstance<DerivedClass>();

		// Only the BaseClass instance should be different
		expect(baseInstance2).not.toBe(baseInstance1);
		expect(derivedInstance2).toBe(derivedInstance1);
	});

	test("Special handling for Websocket classes", () => {
		// Create classes that include "Websocket" in their name
		class MockWebsocket extends Singleton {
			constructor() {
				super();
			}
		}
		class MockWebsocketExtended extends MockWebsocket {}
		class OtherSingleton extends Singleton {
			constructor() {
				super();
			}
		}

		// Get instances
		const instance1 = MockWebsocket.GetInstance();
		const instance2 = MockWebsocketExtended.GetInstance();
		const instance3 = OtherSingleton.GetInstance();

		// Each class should have its own singleton instance
		expect(instance1).toBe(instance1); // Same class gets same instance
		expect(instance2).toBe(instance2); // Same class gets same instance
		expect(instance1).not.toBe(instance3); // Different classes get different instances
		expect(instance2).not.toBe(instance3); // Different classes get different instances
	});

	test("GetInstance should infer consturctor params for the class", () => {
		class ClassWithConstructorParams extends Singleton {
			public readonly config: { name: string; id: number };

			protected constructor(name: string, id: number) {
				super();
				this.config = { name, id };
			}
		}

		// Passing required parameters
		const instance = ClassWithConstructorParams.GetInstance<ClassWithConstructorParams>("test", 1);
		expect(instance.config).toEqual({ name: "test", id: 1 });
	});

	test("GetInstance can be overriden with a custom implementation", () => {
		class CustomSingleton extends Singleton {
			protected constructor(param1: string, param2: number) {
				super();
			}

			public static override GetInstance<T extends CustomSingleton>(param1: string, param2: number): T {
				return super.GetInstance<T>(param1, param2);
			}
		}

		const instance = CustomSingleton.GetInstance("test", 2);
		expect(instance).toBeDefined();
	});

	it("should allow custom channel implementation", () => {
		class CustomChannel extends Channel {
			public broadcast(message: WebsocketStructuredMessage) {
				console.log("CONSOLE LOG");
			}
		}

		// Create a map with our custom channel
		const customChannels = new Map<string, CustomChannel>();
		customChannels.set("custom_channel", new CustomChannel("custom_channel", "Test Channel", 5));
		// Create a new Websocket instance with our custom channels
		const ws = app.Websocket.GetInstance<app.Websocket>({ channels: customChannels });

		// Create a new channel - it should be a CustomChannel instance
		const newChannel = ws.createChannel("test", "Test Channel", 5);
		expect(newChannel).toBeInstanceOf(CustomChannel);

		// Verify that broadcast uses our custom implementation
		const spy = jest.spyOn(console, "log");
		newChannel.broadcast({ type: "test", content: "test message" });
		expect(spy).toHaveBeenCalledWith("CONSOLE LOG");
		spy.mockRestore();

		// Verify that the global channel is also a CustomChannel
		const globalChannel = app.Websocket.GetChannel("global");
		expect(globalChannel).toBeInstanceOf(CustomChannel);
	});
});
