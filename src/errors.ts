// Error code enums
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

/**
 * WebSocket close event codes
 * 
 * Standard codes (1000-1999):
 * - 1000-1015: Reserved for the WebSocket protocol
 * 
 * Application-specific codes:
 * - 4000-4999: Reserved for application use
 */
export enum WS_ERROR_CODE {
	// Standard WebSocket close codes (1000-1015)
	NORMAL_CLOSURE = 1000,        // Normal closure; the connection successfully completed whatever purpose for which it was created
	GOING_AWAY = 1001,            // The endpoint is going away (server shutdown or browser navigating away)
	PROTOCOL_ERROR = 1002,        // Protocol error
	UNSUPPORTED_DATA = 1003,      // Received data of a type it cannot accept (e.g., text-only endpoint received binary data)
	NO_STATUS_RECEIVED = 1005,    // No status code was provided even though one was expected
	ABNORMAL_CLOSURE = 1006,      // Connection was closed abnormally (e.g., without sending or receiving a Close control frame)
	INVALID_FRAME_PAYLOAD_DATA = 1007, // Received data that was not consistent with the type of the message
	POLICY_VIOLATION = 1008,      // Policy violation
	MESSAGE_TOO_BIG = 1009,       // Message was too big and was rejected
	MISSING_EXTENSION = 1010,     // Client expected the server to negotiate one or more extension, but server didn't
	INTERNAL_ERROR = 1011,        // Server encountered an unexpected condition that prevented it from fulfilling the request
	SERVICE_RESTART = 1012,       // Server is restarting
	TRY_AGAIN_LATER = 1013,       // Server is too busy or the client is rate-limited
	BAD_GATEWAY = 1014,           // Gateway or proxy received an invalid response from the upstream server
	TLS_HANDSHAKE = 1015,         // TLS handshake failure
	
	// Application-specific codes (4000-4999)
	// Add your application-specific codes here as needed
	// Example:
	APP_AUTHENTICATION_FAILED = 4000,
	APP_INVALID_MESSAGE_FORMAT = 4001,
}
