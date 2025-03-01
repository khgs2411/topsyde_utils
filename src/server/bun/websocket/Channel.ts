import { Lib } from "../../../utils";
import Websocket from "./Websocket";
import type { I_WebsocketChannel, I_WebsocketClient, I_WebsocketEntity, WebsocketChannel, WebsocketStructuredMessage } from "./websocket.types";

export default class Channel implements I_WebsocketChannel {
	public createdAt: Date = new Date();
	public id: string;
	public name: string;
	public limit: number;
	public members: Map<string, I_WebsocketClient>;
	public metadata: Record<string, string>;

	constructor(id: string, name: string, limit?: number, members?: Map<string, I_WebsocketClient>, metadata?: Record<string, string>) {
		this.id = id;
		this.name = name;
		this.limit = limit ?? 5;
		this.members = members ?? new Map();
		this.metadata = metadata ?? {};
	}

	public broadcast<T = any>(message: WebsocketStructuredMessage, ...args: T[]) {
		Websocket.Broadcast(this.id, message, ...args);
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
