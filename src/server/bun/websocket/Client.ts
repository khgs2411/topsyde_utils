import { ServerWebSocket } from "bun";
import Channel from "./Channel";
import type { I_WebsocketClient, WebsocketClientData, WebsocketChannel, WebsocketStructuredMessage } from "./websocket.types";

export default class Client implements I_WebsocketClient {
	public id: string;
	public ws: ServerWebSocket<WebsocketClientData>;
	protected channels: WebsocketChannel = new Map();

	constructor(id: string, ws: ServerWebSocket<WebsocketClientData>) {
		this.id = id;
		this.ws = ws;
	}

	public joinChannel(channel: Channel) {
		this.channels.set(channel.getId(), channel);
		this.subscribe(channel.getId());
		this.send({ type: "client.channel.added", content: { channelId: channel.getId() } });
	}

	public leaveChannel(channel: Channel) {
		this.channels.delete(channel.getId());
		this.unsubscribe(channel.getId());
		this.send({ type: "client.channel.removed", content: { channelId: channel.getId() } });
	}

	public getChannels() {
		return this.channels;
	}

	public getId() {
		return this.id;
	}

	public send(message: WebsocketStructuredMessage) {
		this.ws.send(JSON.stringify(message));
	}

	public subscribe(channel: string): void {
		this.ws.subscribe(channel);
	}

	public unsubscribe(channel: string): void {
		this.ws.unsubscribe(channel);
	}
}