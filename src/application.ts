import { I_ApplicationResponse } from "./types";

export const RESPONSE_INIT = (status?: number, headers?: HeadersInit): ResponseInit => {
	return {
		status: status ?? 200,
		headers: HEADERS_INIT(headers),
	};
};

export const HEADERS_INIT = (headers?: HeadersInit): HeadersInit => {
	return {
		"Access-Control-Allow-Origin": "*", // Specific origin
		"Content-Type": "application/json",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
		"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Origin, Accept",
		"Access-Control-Allow-Credentials": "true",
		"Access-Control-Max-Age": "86400", // 24 hours
		...headers,
	};
};

export const RESPONSE_METHOD_OPTIONS = {
	name: "Access-Control-Max-Age",
	value: "86400",
};

function isApplicationResponse<T>(data: T | I_ApplicationResponse<T>): data is I_ApplicationResponse<T> {
	return typeof data === "object" && data !== null && "status" in data;
}

class Application {
	public static Response<T>(data: T | I_ApplicationResponse<T>, status = 200, headers?: HeadersInit): Response {
		const response = isApplicationResponse(data) ? data : { status: true, data };
		return Response.json(response, RESPONSE_INIT(status, headers));
	}

	public static Error<T extends BodyInit | unknown | Error>(error: T | I_ApplicationResponse<T>, status = 200, headers?: HeadersInit): Response {
		const response = isApplicationResponse(error) ? error : { status: false, data: error, error };
		return Response.json(response, RESPONSE_INIT(status, headers));
	}

	public static Throw<T extends BodyInit | unknown | Error>(error: T | I_ApplicationResponse<T>, status = 400, headers?: HeadersInit): Response {
		const response = isApplicationResponse(error) ? error : { status: false, data: error, error };
		return Response.json(response, RESPONSE_INIT(status, headers));
	}
}

export default Application;
