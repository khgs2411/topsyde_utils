import { ERROR_CODE } from "../errors";
import { Throwable } from "..";
import { Debug } from "../lib";
import type { Routes } from "./router";
import { Controller } from "./routes";

class Router_Internal {
	private registry = new Map<string, Controller>();
	private routes: Routes = {};

	async post<T>(req: Request): Promise<T> {
		return await this.handleRequest(req);
	}

	async get<T>(req: Request): Promise<T> {
		return await this.handleRequest(req);
	}

	private async handleRequest<T>(request: Request): Promise<T> {
		const path = this.getPath(request);
		const output = await this.resolve(path).call(request);
		return output;
	}

	private getPath(request: Request): string {
		return new URL(request.url).pathname;
	}

	private resolve(path: string): Controller {
		const controllerKey = path.split("/")[1];
		return this.register(controllerKey, () => this.controllerFactory(controllerKey));
	}

	private register(controllerKey: string, factory: () => Controller): Controller {
		if (!this.registry.has(controllerKey)) {
			this.registry.set(controllerKey, factory());
			Debug.Log(`Caching controller: /${controllerKey}`);
		}
		return this.registry.get(controllerKey) as Controller;
	}

	public setRoutes(routes: Routes): void {
		this.routes = routes;
	}

	private controllerFactory(controllerKey: string): Controller {
		if (!(controllerKey in this.routes)) throw new Throwable(`${ERROR_CODE.INVALID_CONTROLLER}: ${controllerKey}`, { logError: false });

		const ControllerClass = this.routes[controllerKey as keyof typeof this.routes];

		return new ControllerClass();
	}
}

export default Router_Internal;
