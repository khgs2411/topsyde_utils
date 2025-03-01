import { Server, ServerWebSocket, WebSocketHandler } from "bun";
import Singleton from "../../../singleton";
import { Lib } from "../../../utils";
import { Console } from "../../../utils/Console";
import Channel from "./Channel";
import type {
	I_WebsocketChannel,
	I_WebsocketClient,
	I_WebsocketEntity,
	I_WebsocketInterface,
	WebsocketChannel,
	WebsocketClientData,
	WebsocketMessage,
	WebsocketStructuredMessage,
} from "./websocket.types";

export default class Websocket extends Singleton {
	protected _channels: WebsocketChannel;
	protected _clients: Map<string, I_WebsocketClient> = new Map();
	private _server!: Server;
	private _channelClass: typeof Channel;
	private _ws_interface?: I_WebsocketInterface;
	protected constructor(ws_interface?: I_WebsocketInterface, channels?: WebsocketChannel) {
		super();
		this._ws_interface = ws_interface;
		this._channels = channels ?? new Map<string, Channel>();
		this._channelClass = this.getChannelClass(channels);
		this.createChannel("global", "Global", 1000);
	}

	private set server(value: Server) {
		this._server = value;
	}

	public get server(): Server {
		return this._server;
	}

	public set(server: Server) {
		this.server = server;
		Console.success("Websocket server set");
	}

	public createChannel(id: string, name: string, limit?: number): I_WebsocketChannel {
		if (this._channels.has(id)) return this._channels.get(id) as I_WebsocketChannel;
		const channel = new this._channelClass(id, name, limit);
		this._channels.set(id, channel);
		return channel;
	}

	public static CreateChannel(id: string, name: string, limit?: number) {
		const ws = this.GetInstance<Websocket>();
		return ws.createChannel(id, name, limit);
	}

	public setup(): WebSocketHandler<WebsocketClientData> {
		return {
			open: this.clientConnected,
			message: this.clientMessageReceived,
			close: this.clientDisconnected,
		};
	}

	private clientMessageReceived = (ws: ServerWebSocket<WebsocketClientData>, message: WebsocketMessage) => {
		if (Websocket.Heartbeat(ws, message)) return;

		const setup = this._ws_interface?.setup(this._channels);
		if (setup && setup.message) return setup.message(ws, message);

		ws.send("This is the message from the server: " + message);
		Websocket.BraodcastAll({ type: "client.message.received", content: message });
	};

	private handleHeartbeat = (ws: ServerWebSocket<WebsocketClientData>, message: WebsocketMessage) => {
		if (message === "ping") {
			const pong: WebsocketStructuredMessage = { type: "pong", content: "pong" };
			ws.send(JSON.stringify(pong));
			return true;
		}
		return false;
	};

	private clientConnected = (ws: ServerWebSocket<WebsocketClientData>) => {
		const global = this._channels.get("global");
		if (!global) throw new Error("Global channel not found");

		const client = global.addMember({ id: ws.data.id, ws: ws, name: ws.data.name });
		if (!client) throw new Error("Failed to add client to global channel");

		this._clients.set(client.id, client);
		client.send({ type: "client.connected", content: { client: client.whoami() } });
	};

	private clientDisconnected = (ws: ServerWebSocket<WebsocketClientData>) => {
		Lib.Log("WebSocket connection closed");

		this._channels.forEach((channel) => {
			channel.removeMember({ id: ws.data.id, ws: ws, name: ws.data.name });
		});

		this._clients.delete(ws.data.id);
	};

	public static Heartbeat(ws: ServerWebSocket<WebsocketClientData>, message: WebsocketMessage) {
		const self = this.GetInstance<Websocket>();
		return self.handleHeartbeat(ws, message);
	}

	public static Server() {
		return this.GetInstance<Websocket>().server;
	}

	public static Broadcast(channel: string, message: WebsocketStructuredMessage) {
		// Get the server from the singleton instance
		const ws = Websocket.GetInstance<Websocket>();
		if (!ws.server) {
			throw new Error("Websocket server not set");
		}
		ws.server.publish(channel, JSON.stringify(message));
	}

	public static BraodcastAll(message: WebsocketStructuredMessage) {
		const ws = this.GetInstance<Websocket>();
		ws._channels.forEach((channel) => channel.broadcast(message));
	}

	public static Join(channel: string, entity: I_WebsocketEntity) {
		const ws = this.GetInstance<Websocket>();
		ws._channels.get(channel)?.addMember(entity);
	}

	public static Leave(channel: string, entity: I_WebsocketEntity) {
		const ws = this.GetInstance<Websocket>();
		ws._channels.get(channel)?.removeMember(entity);
	}

	public static GetClient(id: string) {
		const ws = this.GetInstance<Websocket>();
		return ws._clients.get(id);
	}

	public static GetChannel(id: string) {
		const ws = this.GetInstance<Websocket>();
		return ws._channels.get(id);
	}

	public static GetChannels() {
		const ws = this.GetInstance<Websocket>();
		return Array.from(ws._channels.values());
	}

	public static GetClients() {
		const ws = this.GetInstance<Websocket>();
		return Array.from(ws._clients.values());
	}

	public static GetClientCount() {
		const ws = this.GetInstance<Websocket>();
		return ws._clients.size;
	}

	public static GetChannelCount() {
		const ws = this.GetInstance<Websocket>();
		return ws._channels.size;
	}

	private getChannelClass(channels: WebsocketChannel | undefined) {
		if (channels && channels.size > 0) {
			const firstChannel = channels.values().next().value;
			if (firstChannel) {
				return firstChannel.constructor as typeof Channel;
			} else {
				return Channel;
			}
		} else {
			return Channel;
		}
	}
}
