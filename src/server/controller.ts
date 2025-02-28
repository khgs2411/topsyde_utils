import { ERROR_CODE } from "../errors";
import Initializable, { InitializableOptions } from "../initializable";
import { I_ApplicationResponse } from "../types";
import { Guards } from "../utils";

export type ControllerResponse<T = unknown> = Promise<I_ApplicationResponse<T> | PromiseLike<I_ApplicationResponse<T>>>;
export type ControllerAction<T> = (req: Request) => ControllerResponse<T>;
export type ControllerMap<T = unknown> = Map<string, ControllerAction<T>>;
export type ControllerOptions<T = unknown> = InitializableOptions & {
	path: string | undefined;
	post: Map<string, ControllerAction<T>>;
	get: ControllerMap<T>;
	controllerMap: Map<string, ControllerMap<T>>;
};

export default abstract class Controller extends Initializable {
	path: string | undefined;
	post: Map<string, ControllerAction<any>> = new Map();
	get: ControllerMap = new Map();
	controllerMap: Map<string, ControllerMap> = new Map();

	constructor() {
		super();
		this.POST();
		this.GET();
		this.setControllerMap();
	}

	public static Create<T>(this: new () => T): T {
		return new this();
	}

	public static async AsyncCreate<T>(this: new () => T): Promise<T> {
		return new this();
	}

	public async call<T>(request: Request): Promise<T> {
		await this.isInitialized();
		const action = this.resolve(request);
		return await action(request);
	}

	private setControllerMap() {
		this.controllerMap.set("GET", this.get);
		this.controllerMap.set("POST", this.post);
	}

	private resolve(req: Request): Function {
		const url = new URL(req.url);
		const endpointArray = url.pathname.split("/");
		const actionName = endpointArray.slice(2).join("/");

		if (!Guards.IsString(actionName, true)) throw ERROR_CODE.INVALID_ACTION;

		const methodMap = this.controllerMap.get(req.method);

		if (Guards.IsNil(methodMap)) {
			throw ERROR_CODE.INVALID_METHOD;
		}

		return this.resolveAction(methodMap, actionName);
	}

	private resolveAction(methodMap: ControllerMap, actionName: string) {
		const action = methodMap.get(actionName) as Function;

		if (!Guards.IsFunction(action, true)) {
			throw ERROR_CODE.NO_ACTION_IN_MAP;
		}

		return action;
	}

	/**
	 * Abstract method that needs to be implemented in derived classes.
	 * This method is used to map post actions to their corresponding handler methods.
	 *
	 * Each action is a string that represents a specific operation, and the handler is a function that performs this operation.
	 * The handler is bound to the current context (`this`) to ensure it has access to the class's properties and methods.
	 *
	 * Example implementation:
	 *
	 * ```typescript
	 * setActionsMap() {
	 *     this.post.set("action", this.controllerMethod.bind(this));
	 * }
	 * ```
	 *
	 * In this example, when "https://webserver_url:port/controller/action" is called by the router, the `controllerMethod` method will be called.
	 */
	abstract POST(): void;

	/**
	 * Abstract method that needs to be implemented in derived classes.
	 * This method is used to map actions to their corresponding handler methods.
	 *
	 * Each action is a string that represents a specific operation, and the handler is a function that performs this operation.
	 * The handler is bound to the current context (`this`) to ensure it has access to the class's properties and methods.
	 *
	 * Example implementation:
	 *
	 * ```typescript
	 * setActionsMap() {
	 *     this.get.set("action", this.controllerMethod.bind(this));
	 * }
	 * ```
	 *
	 * In this example, when "https://webserver_url:port/controller/action" is called by the router, the `controllerMethod` method will be called.
	 */
	abstract GET(): void;
}
