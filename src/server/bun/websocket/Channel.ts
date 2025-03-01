import { Guards, Lib } from "../../../utils";
import Websocket from "./Websocket";
import type {
	BroadcastOptions,
	I_WebsocketChannel,
	I_WebsocketClient,
	I_WebsocketEntity,
	WebsocketChannel,
	WebsocketStructuredMessage,
} from "./websocket.types";

export default class Channel<T extends Websocket = Websocket> implements I_WebsocketChannel<T> {
	public createdAt: Date = new Date();
	public id: string;
	public name: string;
	public limit: number;
	public members: Map<string, I_WebsocketClient>;
	public metadata: Record<string, string>;
	public ws: T;
	// Message template for reuse
	private messageTemplate: WebsocketStructuredMessage<any>;

	constructor(id: string, name: string, ws: T, limit?: number, members?: Map<string, I_WebsocketClient>, metadata?: Record<string, string>) {
		this.id = id;
		this.name = name;
		this.limit = limit ?? 5;
		this.members = members ?? new Map();
		this.metadata = metadata ?? {};
		this.ws = ws;
		this.messageTemplate = {
			type: "",
			content: {},
			channel: this.id,
			timestamp: "",
		};
	}

	public broadcast(message: WebsocketStructuredMessage, options?: BroadcastOptions) {
		// Clone the template (faster than creating new objects)
		const output = Object.assign({}, this.messageTemplate);
		const debug = options?.debug ?? false;
		// Set the dynamic properties in a single pass
		output.type = message.type;
		output.channel = this.id;
		// Process message content based on type
		if (typeof message.content === "string") {
			output.content = { message: message.content };
		} else if (typeof message.content === "object" && message.content !== null) {
			output.content = { ...message.content };
		} else {
			output.content = {};
		}

		if (debug) console.log("Channel- Options: ", options);
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
			if (debug)
				console.log(
					"Channel- Client data: ",
					options.client,
					Guards.IsObject(options.client),
					Guards.IsString(options.client?.id, true),
				);
			// Add client information if provided
			if (options.client && Guards.IsObject(options.client) && Guards.IsString(options.client.id, true)) {
				output.client = {
					id: options.client.id,
					name: options.client.name,
				};
			}
			if (debug) console.log("Channel- Client: ", output.client);

			// Include channel metadata if requested
			if (options.includeMetadata) {
				output.metadata = options.includeMetadata === true ? this.getMetadata() : this.getFilteredMetadata(options.includeMetadata);
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
				const transformed = options.transform(output);
				// Publish the transformed output
				this.ws.server.publish(this.id, JSON.stringify(transformed));
				return;
			}

			// Handle excluded clients if needed
			if (options.excludeClients && options.excludeClients.length > 0) {
				// For large channels with many excluded clients, it might be more efficient
				// to send directly to each client instead of using channel publish
				if (this.members.size > 10 && options.excludeClients.length > this.members.size / 3) {
					const serializedMessage = JSON.stringify(output);
					for (const [clientId, client] of this.members) {
						if (!options.excludeClients.includes(clientId)) {
							client.ws.send(serializedMessage);
						}
					}
					return;
				}
			}
		} else {
			// Default timestamp behavior when no options provided
			output.timestamp = new Date().toISOString();
		}
		// Publish to the channel
		if (debug) console.log("Channel- Output: ", output);
		this.ws.server.publish(this.id, JSON.stringify(output));
	}

	// Helper method for filtered metadata
	private getFilteredMetadata(keys: string[]) {
		const metadata = this.getMetadata();
		const filtered: Record<string, string> = {};

		for (const key of keys) {
			if (metadata[key] !== undefined) {
				filtered[key] = metadata[key];
			}
		}

		return filtered;
	}

	public hasMember(client: I_WebsocketEntity | string) {
		if (typeof client === "string") return this.members.has(client);
		return this.members.has(client.id);
	}

	public addMember(client: I_WebsocketClient) {
		if (!this.canAddMember()) return false;
		this.members.set(client.id, client);
		client.joinChannel(this);
		return client;
	}

	public removeMember(entity: I_WebsocketEntity) {
		if (!this.members.has(entity.id)) return false;
		const client = this.members.get(entity.id);
		if (!client) return false;
		client.leaveChannel(this);
		this.members.delete(entity.id);
		return client;
	}

	public getMember(client: I_WebsocketEntity | string) {
		if (typeof client === "string") return this.members.get(client);
		return this.members.get(client.id);
	}

	public getMembers(clients?: string[] | I_WebsocketEntity[]): I_WebsocketClient[] {
		if (!clients) return Array.from(this.members.values());
		return clients.map((client) => this.getMember(client)).filter((client) => client !== undefined) as I_WebsocketClient[];
	}

	public getMetadata() {
		return this.metadata;
	}

	public getCreatedAt() {
		return this.createdAt;
	}

	public getId() {
		return this.id;
	}

	public getName() {
		return this.name;
	}

	public getLimit() {
		return this.limit;
	}

	public getSize() {
		return this.members.size;
	}

	public canAddMember() {
		const size = this.getSize();
		return size < this.limit;
	}

	public static GetChannelType(channels: WebsocketChannel<I_WebsocketChannel> | undefined) {
		if (!channels) return Channel;
		if (channels.size > 0) {
			const firstChannel = channels.values().next().value;
			if (firstChannel) {
				return firstChannel.constructor as typeof Channel;
			} else {
				return Channel;
			}
		} else {
			Lib.Warn("Channels are empty, using default channel class");
			return Channel;
		}
	}
}
