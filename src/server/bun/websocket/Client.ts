import { ServerWebSocket } from "bun";
import type {
	I_WebsocketClient,
	WebsocketEntityData,
	WebsocketChannel,
	WebsocketStructuredMessage,
	I_WebsocketEntity,
	I_WebsocketChannel,
} from "./websocket.types";
import { E_WebsocketMessageType } from "./websocket.enums";
import { Lib } from "../../../utils";

export default class Client implements I_WebsocketClient {
	private _id: string;
	private _name: string;
	private _ws: ServerWebSocket<WebsocketEntityData>;
	private _channels: WebsocketChannel<I_WebsocketChannel>;

	private set ws(value: ServerWebSocket<WebsocketEntityData>) {
		this._ws = value;
	}

	public get ws(): ServerWebSocket<WebsocketEntityData> {
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

	private set channels(value: WebsocketChannel<I_WebsocketChannel>) {
		this._channels = value;
	}

	public get channels(): WebsocketChannel<I_WebsocketChannel> {
		return this._channels;
	}

	constructor(entity: I_WebsocketEntity) {
		this._id = entity.id;
		this._name = entity.name;
		this._ws = entity.ws;
		this.ws = entity.ws;
		this._channels = new Map();
	}

	public joinChannel(channel: I_WebsocketChannel, send: boolean = true) {
		const channel_id = channel.getId();
		this.subscribe(channel_id);
		this.channels.set(channel_id, channel);
		if (send)
			this.send({
				type: E_WebsocketMessageType.CLIENT_JOIN_CHANNEL,
				content: { message: "Welcome to the channel" },
				channel: channel_id,
				client: this.whoami(),
			});
	}

	public leaveChannel(channel: I_WebsocketChannel, send: boolean = true) {
		const channel_id = channel.getId();
		this.channels.delete(channel_id);
		this.unsubscribe(channel_id);
		if (send)
			this.send({
				type: E_WebsocketMessageType.CLIENT_LEAVE_CHANNEL,
				content: { message: "Left the channel" },
				channel: channel_id,
				client: this.whoami(),
			});
	}

	public joinChannels(channels: I_WebsocketChannel[], send: boolean = true) {
		channels.forEach((channel) => {
			this.joinChannel(channel, false);
		});
		if (send) this.send({ type: E_WebsocketMessageType.CLIENT_JOIN_CHANNELS, content: { channels }, client: this.whoami() });
	}

	public leaveChannels(channels?: I_WebsocketChannel[], send: boolean = true) {
		if (!channels) channels = Array.from(this.channels.values());
		channels.forEach((channel) => {
			this.leaveChannel(channel, false);
		});
		if (send) this.send({ type: E_WebsocketMessageType.CLIENT_LEAVE_CHANNELS, content: { channels }, client: this.whoami() });
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

	public static GetClientType(clients: Map<string, I_WebsocketClient> | undefined): typeof Client {
		if (!clients) return Client;
		if (clients.size > 0) {
			const firstClient = clients.values().next().value;
			if (firstClient) {
				return firstClient.constructor as typeof Client;
			}
		}

		// Fallback to default Client class
		Lib.Warn("Clients map is empty, using default client class");
		return Client;
	}
}
