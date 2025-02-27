import Guards from "./guards";
import Lib from "./lib";

export enum ERROR_CODE {
	NO_REQUEST = -1,
	UNKNOWN_ERROR = 0,
	INVALID_METHOD = 1,
	INVALID_REQUEST = 2,
	INVALID_CONTROLLER = 3,
	INVALID_ACTION = 4,
	NO_ACTION_IN_MAP = 5,
	NO_METHOD_HANDLER = 6,
	INVALID_METHOD_INPUT = 7,
	REQ_BODY_EMPTY = 8,
}

export enum HTTP_ERROR_CODE {
	OK = 200,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	INTERNAL_SERVER_ERROR = 500,
}

export enum WS_ERROR_CODE {
	// WebSocket close event codes
	NORMAL_CLOSURE = 1000,
	GOING_AWAY = 1001,
	PROTOCOL_ERROR = 1002,
	UNSUPPORTED_DATA = 1003,
	NO_STATUS_RECEIVED = 1005,
	ABNORMAL_CLOSURE = 1006,
	INVALID_FRAME_PAYLOAD_DATA = 1007,
	POLICY_VIOLATION = 1008,
	MESSAGE_TOO_BIG = 1009,
	MISSING_EXTENSION = 1010,
	INTERNAL_ERROR = 1011,
	SERVICE_RESTART = 1012,
	TRY_AGAIN_LATER = 1013,
	BAD_GATEWAY = 1014,
	TLS_HANDSHAKE = 1015,
}


/**
 * @description Custom error class to throw errors without prompting Sentry
 */
class Throwable extends Error {
	constructor(message: unknown, log_error: boolean = true) {
		const _message = Guards.IsString(message) ? message : JSON.stringify(message);
		super(_message);
		this.name = "Throwable";
		if (log_error) Lib.$Log("Throwable: ", message);

		// Capture stack trace if available
		if (message instanceof Error) {
			this.stack = message.stack;
			this.cause = message.cause;
		}
	}

	static IsThrowable(e: any): e is Throwable {
		return e instanceof Throwable;
	}
}
export default Throwable;
