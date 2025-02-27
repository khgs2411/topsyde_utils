import Guards from "./guards";
import Lib from "./lib";

/**
 * @description Custom error class for errors that are expected to be thrown
 * and should not trigger retry mechanisms or be reported to error monitoring services.
 * 
 * Use this class when you want to throw an error that:
 * 1. Is an expected part of the application flow
 * 2. Should not be retried by retry handlers
 * 3. Should not be reported to error monitoring services like Sentry
 */
class Throwable extends Error {
  /** Flag indicating this is a deliberate error that shouldn't be retried */
  public readonly isDeliberate: boolean = true;
  
  /** Original error if this Throwable wraps another error */
  public readonly originalError?: Error;
  
  /** Additional context that might be helpful for debugging */
  public readonly context?: Record<string, unknown>;

  /**
   * Create a new Throwable error
   * @param message Error message or existing Error object to wrap
   * @param options Configuration options
   */
  constructor(
    message: unknown, 
    options: {
      /** Whether to log this error to console (default: true) */
      logError?: boolean;
      /** Additional context data to attach to the error */
      context?: Record<string, unknown>;
    } = {}
  ) {
    const { logError = true, context } = options;
    
    // Format the message appropriately based on type
    const _message = Guards.IsString(message)
      ? message
      : message instanceof Error
        ? message.message
        : JSON.stringify(message);
    
    super(_message);
    this.name = "Throwable";
    this.context = context;
    
    // Log the error if requested
    if (logError) {
      if (context) {
        Lib.$Log("Throwable: ", _message, "Context:", context);
      } else {
        Lib.$Log("Throwable: ", message);
      }
    }

    // Capture stack trace and cause if wrapping an existing error
    if (message instanceof Error) {
      this.stack = message.stack;
      this.cause = message.cause;
      this.originalError = message;
    }
  }

  /**
   * Check if an error is a Throwable
   * @param e Any error to check
   * @returns True if the error is a Throwable
   */
  static IsThrowable(e: any): e is Throwable {
    return e instanceof Throwable;
  }
  
  /**
   * Create a Throwable from any error or message
   * @param error Error or message to convert
   * @param context Additional context to attach
   * @returns A new Throwable instance
   */
  static from(error: unknown, context?: Record<string, unknown>): Throwable {
    if (error instanceof Throwable) {
      return error;
    }
    
    return new Throwable(error, { context });
  }
}

export default Throwable;
