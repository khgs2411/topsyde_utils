import { Server, ServerWebSocket, WebSocketHandler } from "bun";
import Singleton from "../../../singleton";
import { Console } from "../../../utils/Console";
import Channel from "./Channel";
import type { I_WebsocketEntity, WebsocketChannel, WebsocketClientData, WebsocketMessage, WebsocketStructuredMessage } from "./websocket.types";
import { Lib } from "../../../utils";

export default class Websocket extends Singleton {
	protected channels: WebsocketChannel = new Map();
	private _server!: Server;
	
	protected constructor() {
		super();
		const global = new Channel("global", "Global Channel", 1000);
		this.channels.set("global", global);
	}

	public get server(): Server {
		return this._server;
	}

	protected set server(value: Server) {
		this._server = value;
	}

	public set(server: Server) {
		this.server = server;
		Console.success("Websocket server set");
	}

	public setup(): WebSocketHandler<WebsocketClientData> {
		return {
			open: this.clientConnected,
			message: this.clientMessageReceived,
			close: this.clientDisconnected,
		};
	}

	private clientMessageReceived = (ws: ServerWebSocket<WebsocketClientData>, message: WebsocketMessage) => {
		console.log("Received message:", message);
		if (message === "ping") {
			const pong: WebsocketStructuredMessage = { type: "pong", content: "pong" };
			ws.send(JSON.stringify(pong));
		} else ws.send(message);
		Websocket.Publish({ type: "client.message.received", content: message });
	};

	private clientConnected = (ws: ServerWebSocket<WebsocketClientData>) => {
		const global = this.channels.get("global");
		if (global) global.addMember({ id: ws.data.id, ws });
	};

	private clientDisconnected = (ws: ServerWebSocket<WebsocketClientData>) => {
		console.log("WebSocket connection closed");
		this.channels.forEach((channel) => {
			channel.removeMember({ id: ws.data.id, ws });
		});
	};

	public static Server() {
		return this.GetInstance<Websocket>().server;
	}

	public static Broadcast(channel: string, message: WebsocketStructuredMessage) {
		// Get the server from the singleton instance
		const server = this.GetInstance<Websocket>().server;
		if (!server) {
			Lib.Warn("Websocket server not set");
			return;
		}
		server.publish(channel, JSON.stringify(message));
	}

	public static Publish(message: WebsocketStructuredMessage) {
		const ws = this.GetInstance<Websocket>();
		ws.channels.forEach((channel) => {
			channel.broadcast(message);
		});
	}

	public static Join(channel: string, entity: I_WebsocketEntity) {
		const ws = this.GetInstance<Websocket>();
		ws.channels.get(channel)?.addMember(entity);
	}

	public static Leave(channel: string, entity: I_WebsocketEntity) {
		const ws = this.GetInstance<Websocket>();
		ws.channels.get(channel)?.removeMember(entity);
	}
}
