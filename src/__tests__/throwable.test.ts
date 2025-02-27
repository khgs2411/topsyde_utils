import { Throwable } from "../index";

describe("Throwable", () => {
	// Mock console.error to prevent test output pollution
	const originalConsoleError = console.error;
	beforeEach(() => {
		console.error = jest.fn();
	});

	afterEach(() => {
		console.error = originalConsoleError;
	});

	test("should create a Throwable with a string message", () => {
		const message = "Test error message";
		const error = new Throwable(message);

		expect(error).toBeInstanceOf(Throwable);
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe(message);
		expect(error.isDeliberate).toBe(true);
		expect(error.name).toBe("Throwable");
	});

	test("should create a Throwable with an Error object", () => {
		const originalError = new Error("Original error");
		const error = new Throwable(originalError);

		expect(error).toBeInstanceOf(Throwable);
		expect(error.message).toBe("Original error");
		expect(error.originalError).toBe(originalError);
		expect(error.stack).toBe(originalError.stack);
	});

	test("should create a Throwable with context", () => {
		const context = { userId: 123, operation: "test" };
		const error = new Throwable("Test with context", { context });

		expect(error.context).toBe(context);
	});

	test("should not log error when logError is false", () => {
		new Throwable("Silent error", { logError: false });

		expect(console.error).not.toHaveBeenCalled();
	});

	test("IsThrowable should correctly identify Throwable instances", () => {
		const throwable = new Throwable("Test");
		const regularError = new Error("Regular error");

		expect(Throwable.IsThrowable(throwable)).toBe(true);
		expect(Throwable.IsThrowable(regularError)).toBe(false);
		expect(Throwable.IsThrowable(null)).toBe(false);
		expect(Throwable.IsThrowable(undefined)).toBe(false);
		expect(Throwable.IsThrowable("string")).toBe(false);
	});

	test("from() should return the same instance if already a Throwable", () => {
		const original = new Throwable("Original");
		const result = Throwable.from(original);

		expect(result).toBe(original);
	});

	test("from() should create a new Throwable from non-Throwable error", () => {
		const original = new Error("Original");
		const result = Throwable.from(original);

		expect(result).toBeInstanceOf(Throwable);
		expect(result.originalError).toBe(original);
	});
});
