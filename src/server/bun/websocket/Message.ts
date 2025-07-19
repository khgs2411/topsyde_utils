import Guards from "../../../utils/Guards";
import {
	WebsocketStructuredMessage,
	WebsocketMessage,
	WebsocketMessageOptions,
	I_WebsocketChannel,
	I_WebsocketClient,
	WebsocketEntityData,
} from "./websocket.types";

export default class Message {
	private messageTemplate: WebsocketStructuredMessage<any>;

	constructor() {
		this.messageTemplate = { type: "", content: {}, channel: "", timestamp: "" };
	}

	public create(message: WebsocketMessage, options?: WebsocketMessageOptions): WebsocketStructuredMessage {
		// Clone the template (faster than creating new objects)
		const output = Object.assign({}, this.messageTemplate);
		// Set the dynamic properties in a single pass
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

		// Process options in a single pass if provided
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
					name: options.client.name,
				};
			} /* else {
				delete output.client;
			} */

			// Include channel metadata if requested
			if (options.includeMetadata !== false) output.metadata = options.metadata;

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
				const transformed = options.transform(output);
				return transformed;
			}
		} else {
			output.timestamp = new Date().toISOString();
		}

		return output;
	}

	public createWhisper(message: Omit<WebsocketMessage, "type">, options?: WebsocketMessageOptions) {
		return this.create({ ...message, content: message.content, channel: message.channel, type: "whisper" }, options);
	}

	public send(target: I_WebsocketClient, message: WebsocketStructuredMessage): void;
	public send(target: I_WebsocketClient, message: WebsocketMessage, options?: WebsocketMessageOptions): void;
	public send(target: I_WebsocketClient, message: WebsocketStructuredMessage | WebsocketMessage, options?: WebsocketMessageOptions): void {
		target.send(this.create(message, options));
	}

	public alert(target: I_WebsocketClient, reason: string, client?: WebsocketEntityData) {
		target.send(
			this.create(
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

	public serialize<T = string>(message: WebsocketStructuredMessage, transform?: (message: WebsocketStructuredMessage) => T) {
		return transform ? transform(message) : JSON.stringify(message);
	}

	public static Serialize<T = string>(message: WebsocketStructuredMessage, transform: (message: WebsocketStructuredMessage) => T): T;
	public static Serialize<T = string>(message: WebsocketStructuredMessage, transform?: (message: WebsocketStructuredMessage) => T): string | T;
	public static Serialize<T = string>(message: WebsocketStructuredMessage, transform?: (message: WebsocketStructuredMessage) => T): string | T {
		return transform ? transform(message) : JSON.stringify(message);
	}

	public static Create(message: WebsocketMessage, options?: WebsocketMessageOptions): WebsocketStructuredMessage{
		const msg = new Message();
		return msg.create(message, options);
	}
}
