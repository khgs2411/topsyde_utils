import { ERROR_CODE } from "../errors";
import Initializable from "../initializable";
import { Guards } from "../utils";

export default abstract class Service extends Initializable {
	async validateRequestBody<T>(request: Request, keys: (keyof T)[]): Promise<T> {
		return await Service.validateRequestBody(request, keys);
	}

	static async validateRequestBody<T>(request: Request, keys: (keyof T)[]): Promise<T> {
		try {
			let body;
			try {
				body = await request.json();
			} catch (e) {
				body = await request.text();
				const cleanedBody = body
					.replace(/\/\/.*$/gm, "") // Remove comments
					.replace(/\n/g, "") // Remove newlines
					.replace(/\s+/g, " ") // Replace multiple spaces with single space
					.trim(); // Remove leading/trailing whitespace

				body = JSON.parse(cleanedBody);
			}
			if (Guards.IsNil(body)) throw ERROR_CODE.REQ_BODY_EMPTY;
			if (!Guards.IsType<T>(body, keys)) {
				console.error(`Expected keys: ${keys.join(", ")}`);
				throw ERROR_CODE.INVALID_METHOD_INPUT;
			}
			return body;
		} catch (e) {
			if (e instanceof Error || e instanceof SyntaxError) throw "Could not parse request body: " + e;
			throw e;
		}
	}
}
