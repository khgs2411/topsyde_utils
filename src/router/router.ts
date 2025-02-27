import { Route } from './route';

/**
 * Simple router for handling HTTP requests
 */
class Router {
  private routes: Route[] = [];

  /**
   * Add a new route to the router
   */
  public addRoute(route: Route): Router {
    this.routes.push(route);
    return this;
  }

  /**
   * Find a route that matches the given path and method
   */
  public findRoute(path: string, method: string): Route | undefined {
    return this.routes.find(route => route.matches(path, method));
  }

  /**
   * Handle a request by finding and executing the matching route
   */
  public async handleRequest(req: any, res: any): Promise<any> {
    const route = this.findRoute(req.path, req.method);
    
    if (!route) {
      throw new Error(`No route found for ${req.method} ${req.path}`);
    }
    
    return route.handler(req, res);
  }
}

export default Router; 