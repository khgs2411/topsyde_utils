export const RESPONSE_INIT = (status?: number, headers?: HeadersInit): ResponseInit => {
	return {
		status: status ?? 200,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Allow-Credentials": "true",
		},
	};
};

export const RESPONSE_METHOD_OPTIONS = {
	name: "Access-Control-Max-Age",
	value: "86400",
};

class Application {
	public static Response(data: any, status: number = 200, headers?: HeadersInit): Response {
		return Response.json({ status: true, data }, RESPONSE_INIT(status, headers));
	}

	public static Error<T extends BodyInit | unknown | Error>(error: T, status: number = 200, headers?: HeadersInit) {
		return Response.json({ status: false, error }, RESPONSE_INIT(status, headers));
	}

	public static Throw<T extends BodyInit | unknown | Error>(error: T, status: number = 400, headers?: HeadersInit) {
		return Response.json(error, RESPONSE_INIT(status, headers));
	}
}

export default Application;
