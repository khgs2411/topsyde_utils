import Websocket from "./Websocket";
import type { WebsocketStructuredMessage, I_WebsocketClient, I_WebsocketEntity } from "./websocket.types";
import Client from "./Client";
import { Lib } from "../../../utils";

export default class Channel {
	protected createdAt?: Date = new Date();
	protected id: string;
	protected name: string;
	protected limit: number;
	protected members: Map<string, Client>;
	protected metadata: Record<string, string>;

	constructor(id: string, name: string, limit?: number, members?: Map<string, Client>, metadata?: Record<string, string>) {
		this.id = id;
		this.name = name;
		this.limit = limit ?? 5;
		this.members = members ?? new Map();
		this.metadata = metadata ?? {};
	}

	public addMember(entity: I_WebsocketEntity) {
		if (!this.canAddMember()) return;
		const client = new Client(entity.id, entity.ws);
		this.members.set(client.getId(), client);
		client.joinChannel(this);

		this.broadcast({
			type: "channel.member.added",
			content: {
				channelId: this.id,
				clientId: client.getId(),
			},
		});
	}

	public removeMember(entity: I_WebsocketEntity) {
		if (!this.members.has(entity.id)) return;
		const client = this.members.get(entity.id);
		if (!client) return;
		client.leaveChannel(this);
		this.members.delete(entity.id);
	}

	public broadcast(message: WebsocketStructuredMessage, exclude?: string[] | I_WebsocketClient[]) {
		Websocket.Broadcast(this.id, message);
	}

	public hasMember(client: I_WebsocketClient | string) {}

	public getMember(client: I_WebsocketClient | string) {}

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
	private canAddMember() {
		const size = this.getSize();
		return size < this.limit;
	}
}
