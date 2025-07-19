import { Guards, Lib } from "../../../utils";
import Message from "./Message";
import Websocket from "./Websocket";
import type {
	BroadcastOptions,
	I_WebsocketChannel,
	I_WebsocketClient,
	I_WebsocketEntity,
	WebsocketChannel,
	WebsocketMessage
} from "./websocket.types";

export default class Channel<T extends Websocket = Websocket> implements I_WebsocketChannel<T> {
	public createdAt: Date = new Date();
	public id: string;
	public name: string;
	public limit: number;
	public members: Map<string, I_WebsocketClient>;
	public metadata: Record<string, string>;
	public ws: T;
	private message: Message;

	constructor(id: string, name: string, ws: T, limit?: number, members?: Map<string, I_WebsocketClient>, metadata?: Record<string, string>) {
		this.id = id;
		this.name = name;
		this.limit = limit ?? 5;
		this.members = members ?? new Map();
		this.metadata = metadata ?? {};
		this.ws = ws;
		this.message = new Message();
		
	}

	public broadcast(message: WebsocketMessage | string, options?: BroadcastOptions) {
		if (Guards.IsString(message)) {
			const msg: WebsocketMessage = {
				type: "message",
				content: { message },
			};
			message = msg;
		}
		const output = this.message.create(message, { ...options, channel: this.name });
		if (options) {
			// Include channel metadata if requested
			if (options.includeMetadata) {
				output.metadata = options.includeMetadata === true ? this.getMetadata() : this.getFilteredMetadata(options.includeMetadata);
			}

			// Handle excluded clients if needed
			if (options.excludeClients && options.excludeClients.length > 0) {
				// For large channels with many excluded clients, it might be more efficient
				// to send directly to each client instead of using channel publish
				if (this.members.size > 10 && options.excludeClients.length > this.members.size / 3) {
					const serializedMessage = this.message.serialize(output);
					for (const [clientId, client] of this.members) {
						if (!options.excludeClients.includes(clientId)) {
							client.ws.send(serializedMessage);
						}
					}
					return;
				}
			}
		}
		// Publish to the channel
		this.ws.server.publish(this.id, this.message.serialize(output));
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
