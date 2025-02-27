/**
 * Type representing a constructor function or class type
 */
export type Constructor<T> =
  | (abstract new (...args: any[]) => T)
  | (new (...args: any[]) => T)
  | ({ prototype: T } & Function);

/**
 * Enhanced interface for singleton classes, providing type-safe instance management
 */
export type ISingletonConstructor<T extends Singleton = Singleton> =
  Constructor<T> & {
    getInstance<U extends T>(): U;
    getInstance<U extends T>(...args: any[]): U;
    hasInstance(): boolean;
    clearInstance(): void;
  };

/**
 * Base class for implementing the singleton pattern with type-safe instance management.
 * Supports constructors with any number of arguments.
 *
 * @example
 * // No constructor arguments
 * class DatabaseExample extends Singleton {
 *     private constructor() { super(); }
 *     public static connect() {
 *         return this.getInstance();
 *     }
 * }
 *
 * @example
 * // With constructor arguments
 * class EncryptionServiceExample extends Singleton {
 *     private constructor(key: string, algorithm: string) { super(); }
 *     public static create(key: string, algorithm: string) {
 *         return this.getInstance(key, algorithm);
 *     }
 * }
 *
 * @example
 * // Lazy initialization with factory function
 * class ConfigService extends Singleton {
 *     private constructor(configPath: string) {
 *         super();
 *         // Heavy initialization work
 *     }
 *
 *     public static createLazy(configPath: string) {
 *         return () => this.getInstance(configPath);
 *     }
 * }
 */
abstract class Singleton {
  // Using WeakMap allows garbage collection when no references remain to the class
  private static readonly instances = new WeakMap<Function, Singleton>();

  // Lock to prevent concurrent initialization in worker environments
  private static readonly initializationLocks = new WeakMap<
    Function,
    boolean
  >();

  protected constructor() {}

  /**
   * Gets the singleton instance of the class
   * Creates a new instance if one doesn't exist
   */
  public static getInstance<T extends Singleton>(
    this: Constructor<T>,
    ...args: any[]
  ): T {
    const classReference = this;

    // Protection for worker thread environments
    if (Singleton.initializationLocks.get(classReference)) {
      throw new Error("Concurrent initialization of singleton detected");
    }

    try {
      Singleton.initializationLocks.set(classReference, true);

      if (!Singleton.instances.has(classReference)) {
        Singleton.instances.set(
          classReference,
          new (classReference as any)(...args)
        );
      }

      return Singleton.instances.get(classReference) as T;
    } finally {
      Singleton.initializationLocks.delete(classReference);
    }
  }

  /**
   * Checks if an instance already exists
   */
  public static hasInstance<T extends Singleton>(
    this: Constructor<T>
  ): boolean {
    return Singleton.instances.has(this);
  }

  /**
   * Clears the instance (useful for testing or resource cleanup)
   */
  public static clearInstance<T extends Singleton>(this: Constructor<T>): void {
    Singleton.instances.delete(this);
  }

  /**
   * Creates a factory function for lazy initialization
   */
  public static createFactory<T extends Singleton>(
    this: Constructor<T>,
    ...args: any[]
  ): () => T {
    const classReference = this;
    return () => Singleton.getInstance.apply(classReference, args);
  }
}

export default Singleton;
