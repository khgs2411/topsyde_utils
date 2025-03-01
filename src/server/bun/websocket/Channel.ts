import Client from "./Client";
import Websocket from "./Websocket";
import type { I_WebsocketChannel, I_WebsocketClient, I_WebsocketEntity, WebsocketClientData, WebsocketStructuredMessage } from "./websocket.types";

export default class Channel implements I_WebsocketChannel {
	public createdAt: Date = new Date();
	public id: string;
	public name: string;
	public limit: number;
	public members: Map<string, Client>;
	public metadata: Record<string, string>;

	constructor(id: string, name: string, limit?: number, members?: Map<string, Client>, metadata?: Record<string, string>) {
		this.id = id;
		this.name = name;
		this.limit = limit ?? 5;
		this.members = members ?? new Map();
		this.metadata = metadata ?? {};
	}

	public addMember(entity: I_WebsocketEntity) {
		if (!this.canAddMember()) return false;
		const client = new Client(entity);
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

	public broadcast(message: WebsocketStructuredMessage) {
		Websocket.Broadcast(this.id, message);
	}

	public hasMember(client: I_WebsocketEntity | string) {
		if (typeof client === "string") return this.members.has(client);
		return this.members.has(client.id);
	}

	public getMember(client: I_WebsocketEntity | string) {
		if (typeof client === "string") return this.members.get(client);
		return this.members.get(client.id);
	}

	public getMembers(): I_WebsocketClient[] {
		return Array.from(this.members.values());
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
}
