/**
 * Represents a route in the application
 */
export class Route {
  constructor(
    public readonly path: string,
    public readonly method: string,
    public readonly handler: (req: any, res: any) => Promise<any>
  ) {}

  /**
   * Check if this route matches the given path and method
   */
  public matches(path: string, method: string): boolean {
    return this.path === path && this.method === method;
  }
}

export default Route; 