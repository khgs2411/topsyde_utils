import Singleton from "../singleton";

// This file is not meant to be run as a test, but to demonstrate
// type inference capabilities of the GetInstance method

// Class with typed constructor parameters
class TypedSingleton extends Singleton {
  public readonly name: string;
  public readonly id: number;
  public readonly options: { debug: boolean };

  constructor(name: string, id: number, options: { debug: boolean }) {
    super();
    this.name = name;
    this.id = id;
    this.options = options;
  }
}

// TypeScript should infer the parameter types correctly
// This would cause a type error if the parameters don't match
const instance = TypedSingleton.GetInstance<TypedSingleton>(
  "test-name", // string
  123,         // number
  { debug: true } // { debug: boolean }
);

// This would cause a type error (wrong type for id)
// const badInstance = TypedSingleton.GetInstance(
//   "test-name",
//   "not-a-number", // Type error: Argument of type 'string' is not assignable to parameter of type 'number'
//   { debug: true }
// );

// This would cause a type error (missing parameter)
// const missingParamInstance = TypedSingleton.GetInstance(
//   "test-name",
//   123
//   // Missing options parameter
// );

// This would cause a type error (extra parameter)
// const extraParamInstance = TypedSingleton.GetInstance(
//   "test-name",
//   123,
//   { debug: true },
//   "extra" // Extra parameter not expected
// );

// The instance should have the correct types for its properties
const name: string = instance.name;
const id: number = instance.id;
const debug: boolean = instance.options.debug;

// This test file doesn't contain actual tests, just type checking
describe("Type Inference", () => {
  test("This is a placeholder test to avoid test runner errors", () => {
    expect(true).toBe(true);
  });
}); 