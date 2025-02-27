import { I_ApplicationResponse } from "./types";

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
	public static Response<T>(data: T, status: number = 200, headers?: HeadersInit): Response {
		const response: I_ApplicationResponse<T> = {
			status: true,
			data,
		};
		return Response.json(response, RESPONSE_INIT(status, headers));
	}

	public static Error<T extends BodyInit | unknown | Error>(error: T, status: number = 200, headers?: HeadersInit) {
		const response: I_ApplicationResponse<T> = {
			status: false,
			data: error,
			error,
		};
		return Response.json(response, RESPONSE_INIT(status, headers));
	}

	public static Throw<T extends BodyInit | unknown | Error>(error: T, status: number = 400, headers?: HeadersInit) {
		return Response.json(error, RESPONSE_INIT(status, headers));
	}
}

export default Application;
