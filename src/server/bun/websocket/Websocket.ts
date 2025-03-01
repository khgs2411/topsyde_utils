import { Server, ServerWebSocket, WebSocketHandler } from "bun";
import Singleton from "../../../singleton";
import { Lib } from "../../../utils";
import { Console } from "../../../utils/Console";
import Channel from "./Channel";
import Client from "./Client";
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
import { E_WebsocketMessageType } from "./websocket.enums";

export interface I_WebsocketConstructor {
	ws_interface?: I_WebsocketInterface;
	channels?: WebsocketChannel;
	clientClass?: typeof Client;
	channelClass?: typeof Channel;
}

export default class Websocket extends Singleton {
	protected _channels: WebsocketChannel;
	protected _clients: Map<string, I_WebsocketClient> = new Map();
	private _server!: Server;
	private _channelClass: typeof Channel;
	private _clientClass: typeof Client;
	private _ws_interface?: I_WebsocketInterface;
	protected constructor(options?: I_WebsocketConstructor) {
		super();
		this._ws_interface = options?.ws_interface;
		this._channels = options?.channels ?? new Map<string, Channel>();
		this._clientClass = options?.clientClass ?? Client;
		this._channelClass = options?.channelClass ?? Channel.GetChannelType(options?.channels);
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

	public removeChannel(id: string) {
		this._channels.delete(id);
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

		const client = Websocket.CreateClient({ id: ws.data.id, ws: ws, name: ws.data.name });
		this._clients.set(client.id, client);
		global.addMember(client);
		client.send({ type: E_WebsocketMessageType.CLIENT_CONNECTED, content: { client: client.whoami() } });
	};

	private clientDisconnected = (ws: ServerWebSocket<WebsocketClientData>) => {
		Lib.Log("WebSocket connection closed");
		const client = this._clients.get(ws.data.id);
		if (!client) return;
		this._channels.forEach((channel) => {
			channel.removeMember(client);
		});

		this._clients.delete(ws.data.id);
	};

	protected createClient(entity: I_WebsocketEntity): I_WebsocketClient {
		return new this._clientClass(entity);
	}

	public static Heartbeat(ws: ServerWebSocket<WebsocketClientData>, message: WebsocketMessage) {
		const self = this.GetInstance<Websocket>();
		return self.handleHeartbeat(ws, message);
	}

	public static Server() {
		return this.GetInstance<Websocket>().server;
	}

	public static Broadcast(channel: string, message: WebsocketStructuredMessage, ...args: any[]) {
		// Get the server from the singleton instance
		const ws = Websocket.GetInstance<Websocket>();
		if (!ws.server) {
			throw new Error("Websocket server not set");
		}
		ws.server.publish(channel, JSON.stringify({ message, args }));
	}

	public static BraodcastAll(message: WebsocketStructuredMessage, ...args: any[]) {
		const ws = this.GetInstance<Websocket>();
		ws._channels.forEach((channel) => channel.broadcast(message, ...args));
	}

	public static Join(channel: string, entity: I_WebsocketEntity) {
		const ws = this.GetInstance<Websocket>();
		const client = ws._clients.get(entity.id);
		if (!client) return;
		ws._channels.get(channel)?.addMember(client);
	}

	public static Leave(channel: string, entity: I_WebsocketEntity) {
		const ws = this.GetInstance<Websocket>();
		const client = ws._clients.get(entity.id);
		if (!client) return;
		ws._channels.get(channel)?.removeMember(client);
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

	public static CreateClient(entity: I_WebsocketEntity): I_WebsocketClient {
		const ws = this.GetInstance<Websocket>();
		return ws.createClient(entity);
	}
}
