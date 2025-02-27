/**
 * Middleware function type
 */
export type MiddlewareFunction = (req: any, res: any, next: () => Promise<void>) => Promise<void>;

/**
 * Apply a chain of middleware functions
 */
export const applyMiddleware = async (
  req: any,
  res: any,
  middlewares: MiddlewareFunction[]
): Promise<void> => {
  const executeMiddleware = async (index: number): Promise<void> => {
    if (index >= middlewares.length) {
      return;
    }
    
    const middleware = middlewares[index];
    await middleware(req, res, async () => {
      await executeMiddleware(index + 1);
    });
  };
  
  await executeMiddleware(0);
};

/**
 * Common middleware functions
 */
export const commonMiddleware = {
  /**
   * Log request details
   */
  logger: async (req: any, res: any, next: () => Promise<void>): Promise<void> => {
    console.log(`${req.method} ${req.path}`);
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} completed in ${duration}ms`);
  },
  
  /**
   * Add CORS headers
   */
  cors: async (req: any, res: any, next: () => Promise<void>): Promise<void> => {
    res.headers = {
      ...res.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    await next();
  }
}; 