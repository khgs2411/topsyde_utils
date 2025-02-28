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
}); 