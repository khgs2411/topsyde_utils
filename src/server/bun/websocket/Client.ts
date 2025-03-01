import { ServerWebSocket } from "bun";
import Channel from "./Channel";
import type { I_WebsocketClient, WebsocketClientData, WebsocketChannel, WebsocketStructuredMessage, I_WebsocketEntity } from "./websocket.types";

export default class Client implements I_WebsocketClient {
	private _id: string;
	private _name: string;
	private _ws: ServerWebSocket<WebsocketClientData>;
	private _channels: WebsocketChannel;

	private set ws(value: ServerWebSocket<WebsocketClientData>) {
		this._ws = value;
	}

	public get ws(): ServerWebSocket<WebsocketClientData> {
		return this._ws;
	}

	private set id(value: string) {
		this._id = value;
	}

	public get id(): string {
		return this._id;
	}

	public get name(): string {
		return this._name;
	}

	private set name(value: string) {
		this._name = value;
	}

	private set channels(value: WebsocketChannel) {
		this._channels = value;
	}

	public get channels(): WebsocketChannel {
		return this._channels;
	}

	constructor(entity: I_WebsocketEntity) {
		this._id = entity.id;
		this._name = entity.name;
		this._ws = entity.ws;
		this.ws = entity.ws;
		this._channels = new Map();
	}

	public joinChannel(channel: Channel) {
		const channel_id = channel.getId();
		this.subscribe(channel_id);
		this.channels.set(channel_id, channel);
		this.send({ type: "client.channel.added", content: { channel_id } });
	}

	public leaveChannel(channel: Channel) {
		const channel_id = channel.getId();
		this.channels.delete(channel_id);
		this.unsubscribe(channel_id);
		this.send({ type: "client.channel.removed", content: { channel_id } });
	}

	public joinChannels(channels: Channel[]) {
		channels.forEach((channel) => {
			this.joinChannel(channel);
		});
	}

	public leaveChannels(channels?: Channel[]) {
		if (!channels) channels = Array.from(this.channels.values());
		channels.forEach((channel) => {
			this.leaveChannel(channel);
		});
	}

	public whoami(): { id: string; name: string } {
		return { id: this.id, name: this.name };
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
