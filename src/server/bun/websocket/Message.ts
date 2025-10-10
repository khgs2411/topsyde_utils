import Guards from "../../../utils/Guards";
import { WebsocketStructuredMessage, WebsocketMessage, WebsocketMessageOptions, I_WebsocketClient, WebsocketEntityData } from "./websocket.types";

export default class Message {
	// Shared template for all messages
	private static readonly MESSAGE_TEMPLATE: WebsocketStructuredMessage<any> = {
		type: "",
		content: {},
		channel: "",
		timestamp: "",
	};

	// Private constructor to prevent instantiation
	private constructor() {}

	public static Create(message: WebsocketMessage, options?: WebsocketMessageOptions): WebsocketStructuredMessage {
		// Clone the template
		const output = Object.assign({}, Message.MESSAGE_TEMPLATE);

		// Set the dynamic properties
		output.type = message.type;
		output.channel = message.channel || options?.channel || "N/A";

		// Process message content based on type
		if (typeof message.content === "string") {
			output.content = { message: message.content };
		} else if (typeof message.content === "object" && message.content !== null) {
			output.content = { ...message.content };
		} else {
			output.content = {};
		}

		// Process options if provided
		if (options) {
			// Add data if provided
			if (options.data !== undefined) {
				if (typeof options.data === "object" && options.data !== null && !Array.isArray(options.data)) {
					// Merge object data with content
					Object.assign(output.content, options.data);
				} else {
					// Set as data property for other types
					output.content.data = options.data;
				}
			}

			// Add client information if provided
			if (options.client && Guards.IsObject(options.client) && Guards.IsString(options.client.id, true)) {
				output.client = {
					id: options.client.id,
					name: options.client.name || "Unknown",
				};
			}

			// Include channel metadata if requested
			// Include channel metadata if provided as an object
			if (options.metadata && Guards.IsObject(options.metadata) && !Guards.IsArray(options.metadata)) {
				output.metadata = options.metadata;
			}

			// Add timestamp if requested (default: true)
			if (options.includeTimestamp !== false) {
				output.timestamp = new Date().toISOString();
			} else {
				// Remove timestamp if explicitly disabled
				delete output.timestamp;
			}

			// Add priority if specified
			if (options.priority !== undefined) {
				output.priority = options.priority;
			}

			// Add expiration if specified
			if (options.expiresAt !== undefined) {
				output.expiresAt = options.expiresAt;
			}

			// Add any custom fields to the root of the message
			if (options.customFields) {
				Object.assign(output, options.customFields);
			}

			// Apply custom transformation if provided
			if (options.transform) {
				return options.transform(output);
			}
		} else {
			output.timestamp = new Date().toISOString();
		}

		return output;
	}

	public static CreateWhisper(message: Omit<WebsocketMessage, "type">, options?: WebsocketMessageOptions): WebsocketStructuredMessage {
		return Message.Create({ ...message, content: message.content, channel: message.channel, type: "whisper" }, options);
	}

	public static Serialize<T = string>(message: WebsocketStructuredMessage, transform?: (message: WebsocketStructuredMessage) => T): string | T {
		return transform ? transform(message) : JSON.stringify(message);
	}

	public static Send(target: I_WebsocketClient, message: WebsocketMessage, options?: WebsocketMessageOptions): void {
		target.send(Message.Create(message, options));
	}

	public static Alert(target: I_WebsocketClient, reason: string, client?: WebsocketEntityData): void {
		target.send(
			Message.Create(
				{
					content: {
						message: reason,
					},
					channel: "alert",
					type: "message",
				},
				{ client },
			),
		);
	}
}
