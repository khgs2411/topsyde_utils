import Websocket from "./Websocket";
import type { WebsocketStructuredMessage, I_WebsocketClient } from "./websocket.types";
import WebsocketClient from "./WebsocketClient";

export default class Channel {
	private createdAt?: Date = new Date();
	private id: string;
	private name: string;
	private limit: number;
	private members: Map<string, WebsocketClient>;
	private metadata: Record<string, string>;

	constructor(id: string, name: string, limit?: number, members?: Map<string, WebsocketClient>, metadata?: Record<string, string>) {
		this.id = id;
		this.name = name;
		this.limit = limit ?? 5;
		this.members = members ?? new Map();
		this.metadata = metadata ?? {};
	}

	public addMember(client: WebsocketClient) {
		if (this.canAddMember()) {
			this.members.set(client.getId(), client);
			client.joinChannel(this);
		}

		this.broadcast({
			type: "channel.member.added",
			content: {
				channelId: this.id,
				clientId: client.getId(),
			},
		});
	}

	public removeMember(client: WebsocketClient) {
		this.members.delete(client.getId());
		client.leaveChannel(this);
	}

	public broadcast(message: WebsocketStructuredMessage, exclude?: string[] | I_WebsocketClient[]) {
		Websocket.Server().publish(this.id, JSON.stringify(message));
	}

	public hasMember(client: I_WebsocketClient | string) {}
	public getMember(client: I_WebsocketClient | string) {}
	public getMembers(): WebsocketClient[] {
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
	private canAddMember() {
		const size = this.getSize();
		return size < this.limit;
	}
}
