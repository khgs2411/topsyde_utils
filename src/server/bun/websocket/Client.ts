import { ServerWebSocket } from "bun";
import Channel from "./Channel";
import type { I_WebsocketClient, WebsocketClientData, WebsocketChannel } from "./websocket.types";

export default class Client implements I_WebsocketClient {
	public id: string;
	public ws: ServerWebSocket<WebsocketClientData>;
	private channels: WebsocketChannel = new Map();

	constructor(id: string, ws: ServerWebSocket<WebsocketClientData>) {
		this.id = id;
		this.ws = ws;
	}

	public joinChannel(channel: Channel) {
		this.channels.set(channel.getId(), channel);
		this.ws.subscribe(channel.getId());
	}

	public leaveChannel(channel: Channel) {
		this.channels.delete(channel.getId());
		this.ws.unsubscribe(channel.getId());
	}

	public getChannels() {
		return this.channels;
	}

	public getId() {
		return this.id;
	}
}
