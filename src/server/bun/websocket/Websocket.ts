import { Server, ServerWebSocket, WebSocketHandler } from "bun";
import Singleton from "../../../singleton";
import { Console } from "../../../utils/Console";
import Channel from "./Channel";
import type {
	I_WebsocketEntity,
	I_WebsocketInterface,
	WebsocketChannel,
	WebsocketClientData,
	WebsocketMessage,
	WebsocketStructuredMessage,
} from "./websocket.types";
import { Lib } from "../../../utils";

export default class Websocket extends Singleton {
	protected channels: WebsocketChannel = new Map();
	private _server!: Server;

	protected constructor(protected ws_interface?: I_WebsocketInterface) {
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
		if (Websocket.Heartbeat(ws, message)) return;

		const setup = this.ws_interface?.setup();
		if (setup && setup.message) return setup.message(ws, message);

		ws.send("This is the message from the server: " + message);
		Websocket.Publish({ type: "client.message.received", content: message });
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
		const global = this.channels.get("global");
		if (global) global.addMember({ id: ws.data.id, ws });
	};

	private clientDisconnected = (ws: ServerWebSocket<WebsocketClientData>) => {
		Lib.Log("WebSocket connection closed");
		this.channels.forEach((channel) => {
			channel.removeMember({ id: ws.data.id, ws });
		});
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
