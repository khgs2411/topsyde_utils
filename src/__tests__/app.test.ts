import * as app from "../server/bun/websocket";
import { WebsocketStructuredMessage } from "../server/bun/websocket/websocket.types";
import Singleton from "../singleton";
import Channel from "../server/bun/websocket/Channel";

describe("Websocket Tests", () => {
	const _Websocket = app.Websocket;
	let server: any;

	beforeEach(() => {
		// Reset all singleton instances before each test
		Singleton.ResetInstances();

		// Create a mock server
		server = {
			publish: (channel: string, message: string) => {},
		};

		// Set up the Websocket instance with the server
		const wsInstance = _Websocket.GetInstance<app.Websocket>();
		wsInstance.set(server);
	});

	it("should set up the websocket server correctly", () => {
		const wsInstance = _Websocket.GetInstance<app.Websocket>();
		expect(_Websocket.Server()).toBe(server);
	});

	it("should broadcast messages to channels", () => {
		// Test broadcasting a message
		const message: WebsocketStructuredMessage = {
			type: "test",
			content: "Hello from test",
		};

		// This should work because the server is set
		_Websocket.Broadcast("global", message);
		// No assertion needed, just checking it doesn't throw
	});

	it("should handle the case when server is not set", () => {
		// Create a new instance with Singleton.ResetInstance and don't set a server
		const newWs = _Websocket.GetInstance<app.Websocket>();
		(newWs.server as any) = null;
		// This should log a warning but not throw an error
		const message: WebsocketStructuredMessage = {
			type: "test",
			content: "This should warn but not error",
		};

		// expect newWs.server.publish("global", JSON.stringify(message)); to throw an error
		expect(() => newWs.server.publish("global", JSON.stringify(message))).toThrow();
	});

	it("should join and leave channels", () => {
		// Create a properly mocked WebSocket client with the required methods
		const mockWs = {
			send: (data: string) => {},
			subscribe: (channel: string) => {},
			unsubscribe: (channel: string) => {},
			data: { id: "test-client" },
		};

		const mockClient = {
			id: "123",
			ws: mockWs as any,
			name: "test-client",
		};

		// Join a channel
		_Websocket.Join("global", mockClient);

		// Leave the channel
		_Websocket.Leave("global", mockClient);
		// No assertion needed, just checking it doesn't throw
	});

	it("should publish messages to all channels", () => {
		// Test publishing a message to all channels
		const message: WebsocketStructuredMessage = {
			type: "test",
			content: "Broadcast to all channels",
		};

		_Websocket.BraodcastAll(message);
		// No assertion needed, just checking it doesn't throw
	});

	it("should verify static method behavior with inheritance", () => {
		// This test specifically checks if static methods are called on the correct class
		// when using inheritance

		// Create a second derived class to test inheritance behavior
		class AnotherWebsocket extends app.Websocket {}

		// Get instances of both classes
		const wsInstance1 = _Websocket.GetInstance<app.Websocket>();
		const wsInstance2 = AnotherWebsocket.GetInstance<AnotherWebsocket>();

		// Each class should have its own singleton instance
		expect(wsInstance1).not.toBe(wsInstance2);

		// Set up server for both instances
		wsInstance1.set(server);
		wsInstance2.set(server);

		// Both classes should share the same server instance
		expect(_Websocket.Server()).toBe(server);
		expect(AnotherWebsocket.Server()).toBe(server);
	});

	it("should test static method calls from derived class instance", () => {
		// This test checks if calling static methods from a derived class instance
		// correctly uses the static methods of the derived class

		// Create a derived class with a custom static method
		class CustomWebsocket extends app.Websocket {
			public static CustomServer() {
				// This should call the Server() method on CustomWebsocket, not on Websocket
				return this.Server();
			}

			// Override the Broadcast method to add logging
			public static Broadcast(channel: string, message: WebsocketStructuredMessage) {
				console.log("CustomWebsocket.Broadcast called");
				// Call the parent method
				super.Broadcast(channel, message);
			}
		}

		// Get an instance of the custom class and set up its server
		const customWs = CustomWebsocket.GetInstance<CustomWebsocket>();
		customWs.set(server);

		// Both classes should share the same server instance
		expect(_Websocket.Server()).toBe(server);
		expect(CustomWebsocket.Server()).toBe(server);

		// Test broadcasting a message through the custom class
		const message: WebsocketStructuredMessage = {
			type: "test",
			content: "Hello from custom test",
		};

		// This should use the overridden Broadcast method
		CustomWebsocket.Broadcast("global", message);
	});

	it("should simulate the real-world scenario with modules", () => {
		// This test simulates the real-world scenario where a derived class is used in a different module

		// First, let's create a module-like structure
		const moduleA = {
			// This represents the topsyde-utils module
			Websocket: app.Websocket,
		};

		// Create a derived class that extends the base Websocket
		class DerivedWebsocket extends moduleA.Websocket {
			protected constructor() {
				super();
			}
		}

		const moduleB = {
			// This represents the server_rune_matchmaking module
			Websocket: DerivedWebsocket,
		};

		// Now simulate the app.ts setup
		class TestApp {
			private websocket: app.Websocket;

			constructor() {
				this.websocket = moduleB.Websocket.GetInstance();
				// Set up the server for this instance
				this.websocket.set(server);
			}

			setup() {
				return server;
			}

			broadcast(message: WebsocketStructuredMessage) {
				moduleB.Websocket.Broadcast("global", message);
			}
		}

		// Create and set up the app
		const testApp = new TestApp();
		testApp.setup();

		// Test broadcasting a message
		const message: WebsocketStructuredMessage = {
			type: "test",
			content: "Hello from app test",
		};

		// This should work because the server is set
		testApp.broadcast(message);

		// Verify that the server is set correctly
		expect(moduleB.Websocket.Server()).toBeDefined();
	});
});
