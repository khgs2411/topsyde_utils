import { ERROR_CODE } from "../../../errors";
import Singleton from "../../../singleton";
import Guards from "../../../utils/Guards";
import Router_Internal from "./router.internal";
import { Routes } from "./routes";

type MethodMap<T> = {
	[method: string]: (req: Request) => Promise<T>;
};

class Router extends Singleton {
	private internal: Router_Internal;

	public constructor(routes?: Routes) {
		super();
		this.internal = new Router_Internal(routes);
	}

	private setRoutes(routes: Routes): void {
		this.internal.setRoutes(routes);
	}

	public static async Call<T>(request: Request): Promise<T> {
		if (Guards.IsNil(request)) throw ERROR_CODE.NO_REQUEST;
		const methods: MethodMap<T> = this.getMethodMap();
		const method = methods[request.method];

		if (Guards.IsNil(method)) throw ERROR_CODE.INVALID_METHOD;

		return await method(request);
	}

	public static SetRoutes(routes: Routes) {
		Router.GetInstance().setRoutes(routes);
	}

	private static getMethodMap<T>(): MethodMap<T> {
		const router = Router.GetInstance();
		return {
			GET: async (req) => await router.internal.get(req),
			POST: async (req) => await router.internal.post(req),
		};
	}

	public static GetQueryParams(request: Request): URLSearchParams {
		const url = new URL(request.url);
		return url.searchParams;
	}
}

export default Router;
