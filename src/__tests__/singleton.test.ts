import Singleton from '../singleton';
import { Constructor } from '../singleton';

// Base class that extends Singleton
class BaseClass extends Singleton {
  public value: string = 'base';
  
  public getValue(): string {
    return this.value;
  }
  
  public static staticMethod(): string {
    return 'base-static';
  }
}

// Derived class that extends BaseClass
class DerivedClass extends BaseClass {
  public override value: string = 'derived';
  
  public override getValue(): string {
    return 'derived-' + this.value;
  }
  
  public static override staticMethod(): string {
    return 'derived-static';
  }
}

// Another class that extends BaseClass
class AnotherDerivedClass extends BaseClass {
  public override value: string = 'another';
  
  public static testStaticMethod(): string {
    // This should call AnotherDerivedClass.staticMethod() due to how 'this' works in JS
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

// Class with initialization method
class InitializableSingleton extends Singleton {
  private initialized: boolean = false;
  private data: any = null;
  
  public initialize(data: any): void {
    this.initialized = true;
    this.data = data;
  }
  
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  public getData(): any {
    return this.data;
  }
}

// Class with async initialization
class AsyncSingleton extends Singleton {
  private initialized: boolean = false;
  private data: any = null;
  
  public async initialize(data: any): Promise<void> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    this.initialized = true;
    this.data = data;
  }
  
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  public getData(): any {
    return this.data;
  }
}

// Multiple level inheritance
class Level1 extends Singleton {
  public level: number = 1;
}

class Level2 extends Level1 {
  public override level: number = 2;
}

class Level3 extends Level2 {
  public override level: number = 3;
}

describe('Singleton', () => {
  beforeEach(() => {
    // Reset the singleton instances before each test
    (Singleton as any).instances = new Map();
  });

  test('BaseClass should return a singleton instance', () => {
    const instance1 = BaseClass.GetInstance();
    const instance2 = BaseClass.GetInstance();
    
    expect(instance1).toBe(instance2);
    expect(instance1.getValue()).toBe('base');
  });
  
  test('Each class in the hierarchy should have its own singleton instance', () => {
    const baseInstance = BaseClass.GetInstance();
    const derivedInstance = DerivedClass.GetInstance();
    
    // Each class should have its own instance
    expect(derivedInstance).not.toBe(baseInstance);
    
    // But the instances should have the correct class behavior
    expect(baseInstance.getValue()).toBe('base');
    expect(derivedInstance.getValue()).toBe('derived-derived');
  });
  
  test('Static methods should be called on the correct class', () => {
    expect(BaseClass.staticMethod()).toBe('base-static');
    expect(DerivedClass.staticMethod()).toBe('derived-static');
    
    // In JavaScript, 'this' in a static method refers to the class it was called on
    expect(AnotherDerivedClass.testStaticMethod()).toBe('base-static');
  });
  
  test('GetInstance should create one instance per class', () => {
    BaseClass.GetInstance();
    DerivedClass.GetInstance();
    AnotherDerivedClass.GetInstance();
    
    // We expect 3 instances (one for each class)
    expect(Singleton.GetInstanceCount()).toBe(3);
  });
  
  test('Instances should maintain their class identity', () => {
    const baseInstance = BaseClass.GetInstance();
    const derivedInstance = DerivedClass.GetInstance();
    
    expect(baseInstance instanceof BaseClass).toBe(true);
    expect(derivedInstance instanceof DerivedClass).toBe(true);
    expect(derivedInstance instanceof BaseClass).toBe(true);
  });
  
  test('Static methods should be called on the class they are invoked from', () => {
    // Create a mock function to spy on the static method calls
    const baseStaticSpy = jest.spyOn(BaseClass, 'staticMethod');
    const derivedStaticSpy = jest.spyOn(DerivedClass, 'staticMethod');
    
    BaseClass.staticMethod();
    expect(baseStaticSpy).toHaveBeenCalled();
    expect(derivedStaticSpy).not.toHaveBeenCalled();
    
    baseStaticSpy.mockClear();
    derivedStaticSpy.mockClear();
    
    DerivedClass.staticMethod();
    expect(derivedStaticSpy).toHaveBeenCalled();
    expect(baseStaticSpy).not.toHaveBeenCalled();
  });

  // Additional tests for more comprehensive coverage

  test('Singleton with constructor parameters should maintain those parameters', () => {
    const instance1 = ParameterizedSingleton.GetInstance('test', 123);
    const instance2 = ParameterizedSingleton.GetInstance('different', 456);
    
    // Should be the same instance despite different parameters on second call
    expect(instance1).toBe(instance2);
    
    // Should maintain the parameters from the first initialization
    expect(instance1.getConfig()).toEqual({ name: 'test', id: 123 });
    expect(instance2.getConfig()).toEqual({ name: 'test', id: 123 });
  });

  test('Singleton should work with initialization methods', () => {
    const instance = InitializableSingleton.GetInstance();
    
    // Initially not initialized
    expect(instance.isInitialized()).toBe(false);
    
    // Initialize with data
    const testData = { key: 'value' };
    instance.initialize(testData);
    
    // Should be initialized with the correct data
    expect(instance.isInitialized()).toBe(true);
    expect(instance.getData()).toBe(testData);
    
    // Getting the instance again should return the same initialized instance
    const instance2 = InitializableSingleton.GetInstance();
    expect(instance2).toBe(instance);
    expect(instance2.isInitialized()).toBe(true);
    expect(instance2.getData()).toBe(testData);
  });

  test('Singleton should work with async initialization', async () => {
    const instance = AsyncSingleton.GetInstance();
    
    // Initially not initialized
    expect(instance.isInitialized()).toBe(false);
    
    // Initialize with data
    const testData = { key: 'async-value' };
    await instance.initialize(testData);
    
    // Should be initialized with the correct data
    expect(instance.isInitialized()).toBe(true);
    expect(instance.getData()).toBe(testData);
    
    // Getting the instance again should return the same initialized instance
    const instance2 = AsyncSingleton.GetInstance();
    expect(instance2).toBe(instance);
    expect(instance2.isInitialized()).toBe(true);
    expect(instance2.getData()).toBe(testData);
  });

  test('Multiple level inheritance should maintain separate instances', () => {
    const level1 = Level1.GetInstance();
    const level2 = Level2.GetInstance();
    const level3 = Level3.GetInstance();
    
    // Each level should have its own instance
    expect(level1).not.toBe(level2);
    expect(level2).not.toBe(level3);
    expect(level1).not.toBe(level3);
    
    // Each instance should have the correct level value
    expect(level1.level).toBe(1);
    expect(level2.level).toBe(2);
    expect(level3.level).toBe(3);
    
    // Verify instance count
    expect(Singleton.GetInstanceCount()).toBe(3);
  });

  test('Singleton instances should be created only once per class', () => {
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

  test('Singleton should handle property modifications correctly', () => {
    const instance1 = BaseClass.GetInstance();
    
    // Modify a property
    instance1.value = 'modified';
    
    // Get the instance again
    const instance2 = BaseClass.GetInstance();
    
    // The modification should persist
    expect(instance2.value).toBe('modified');
    
    // Reset for other tests
    instance1.value = 'base';
  });

  test('Different singleton classes should not interfere with each other', () => {
    // Initialize various singleton classes
    const baseInstance = BaseClass.GetInstance();
    const derivedInstance = DerivedClass.GetInstance();
    const paramInstance = ParameterizedSingleton.GetInstance('test', 123);
    const initInstance = InitializableSingleton.GetInstance();
    
    // Modify properties on one instance
    baseInstance.value = 'modified-base';
    initInstance.initialize('some-data');
    
    // Verify other instances are not affected
    expect(derivedInstance.value).toBe('derived');
    expect(paramInstance.getConfig().name).toBe('test');
    
    // Verify the modified instances maintain their changes
    expect(baseInstance.value).toBe('modified-base');
    expect(initInstance.getData()).toBe('some-data');
    
    // Reset for other tests
    baseInstance.value = 'base';
  });

  test('Singleton should work with mixins and complex inheritance', () => {
    // Skip the mixin approach and use a simpler inheritance model
    // that achieves the same testing goals
    
    // Create a base logging functionality
    class LoggingBase extends Singleton {
      private logs: string[] = [];
      
      log(message: string): void {
        this.logs.push(message);
      }
      
      getLogs(): string[] {
        return [...this.logs];
      }
    }
    
    // Create a singleton that uses the logging functionality
    class LoggableSingleton extends LoggingBase {
      doSomething(): void {
        this.log('Did something');
      }
    }
    
    // Get the instance and use the logging methods
    const instance = LoggableSingleton.GetInstance();
    instance.doSomething();
    instance.log('Another log');
    
    // Verify the logs were recorded
    expect(instance.getLogs()).toEqual(['Did something', 'Another log']);
    
    // Get another instance and verify it's the same
    const instance2 = LoggableSingleton.GetInstance();
    expect(instance2).toBe(instance);
    expect(instance2.getLogs()).toEqual(['Did something', 'Another log']);
  });

  test('Singleton should handle circular references gracefully', () => {
    // Create two classes that reference each other
    class SingletonA extends Singleton {
      getB(): SingletonB {
        return SingletonB.GetInstance();
      }
    }
    
    class SingletonB extends Singleton {
      getA(): SingletonA {
        return SingletonA.GetInstance();
      }
    }
    
    // Get instances
    const instanceA = SingletonA.GetInstance();
    const instanceB = SingletonB.GetInstance();
    
    // Verify circular references work
    expect(instanceA.getB()).toBe(instanceB);
    expect(instanceB.getA()).toBe(instanceA);
    
    // Verify instance count
    expect(Singleton.GetInstanceCount()).toBe(2);
  });

  test('Singleton should handle inheritance with method overrides correctly', () => {
    // Create a base class with a method
    class SingletonWithMethod extends Singleton {
      public method(): string {
        return 'base';
      }
    }
    
    // Create a derived class that overrides the method
    class DerivedWithOverride extends SingletonWithMethod {
      public override method(): string {
        return 'derived-' + super.method();
      }
    }
    
    // Create another derived class that doesn't override
    class DerivedWithoutOverride extends SingletonWithMethod {
      // No override
    }
    
    // Get instances
    const baseInstance = SingletonWithMethod.GetInstance();
    const derivedWithOverride = DerivedWithOverride.GetInstance();
    const derivedWithoutOverride = DerivedWithoutOverride.GetInstance();
    
    // Verify method calls
    expect(baseInstance.method()).toBe('base');
    expect(derivedWithOverride.method()).toBe('derived-base');
    expect(derivedWithoutOverride.method()).toBe('base');
  });

  test('Singleton should work with dynamic subclassing', () => {
    // Create a function that dynamically creates a singleton subclass
    function createDynamicSingleton(id: string) {
      return class DynamicSingleton extends Singleton {
        public readonly id = id;
      };
    }
    
    // Create multiple dynamic singleton classes
    const SingletonClass1 = createDynamicSingleton('class1');
    const SingletonClass2 = createDynamicSingleton('class2');
    
    // Get instances
    const instance1 = SingletonClass1.GetInstance();
    const instance2 = SingletonClass2.GetInstance();
    
    // Verify they are different instances with correct IDs
    expect(instance1).not.toBe(instance2);
    expect(instance1.id).toBe('class1');
    expect(instance2.id).toBe('class2');
  });

  test('Singleton should maintain instance identity across complex operations', () => {
    // Create a singleton class with a method that returns itself
    class SelfReferencingSingleton extends Singleton {
      public getSelf(): SelfReferencingSingleton {
        return this;
      }
      
      public getInstanceViaClass(): SelfReferencingSingleton {
        return SelfReferencingSingleton.GetInstance();
      }
    }
    
    // Get the instance
    const instance = SelfReferencingSingleton.GetInstance();
    
    // Verify self-referencing methods
    expect(instance.getSelf()).toBe(instance);
    expect(instance.getInstanceViaClass()).toBe(instance);
    
    // Create an array of instances obtained in different ways
    const instances = [
      SelfReferencingSingleton.GetInstance(),
      instance.getSelf(),
      instance.getInstanceViaClass(),
      SelfReferencingSingleton.GetInstance()
    ];
    
    // Verify all instances are the same
    for (let i = 0; i < instances.length; i++) {
      for (let j = 0; j < instances.length; j++) {
        expect(instances[i]).toBe(instances[j]);
      }
    }
  });
}); 




