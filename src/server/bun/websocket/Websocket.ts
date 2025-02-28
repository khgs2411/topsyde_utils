/* Hey, we're working on a game, today we're going to implement the first few steps

we will start with a websocket implementation - an abstraction of bun's websocket functioanlity, here are the docs@https://bun.sh/docs/api/websockets 

lets start simple, I want an abstraction interface for the handlers, suggest a strategy */

import { Server, ServerWebSocket, WebSocketHandler } from "bun";
import Channel from "./Channel";
import Client from "./Client";
import Singleton from "../../../singleton";
import type { WebsocketChannel, WebsocketClientData, WebsocketMessage } from "./websocket.types";


export default class Websocket extends Singleton {
	private channels: WebsocketChannel = new Map();
	private server!: Server;
	private constructor() {
		super();
		const global = new Channel("global", "Global Channel", 1000);
		this.channels.set("global", global);
	}

	public set(server: Server) {
		this.server = server;
	}

	public static Server() {
		return Websocket.GetInstance().server;
	}

	public setup(): WebSocketHandler<WebsocketClientData> {
		return {
			message: this.messageReceived,
			open: this.clientConnected,
			close: this.clientDisconnected,
		};
	}

	private messageReceived = (ws: ServerWebSocket<WebsocketClientData>, message: WebsocketMessage) => {
		console.log("Received message:", message);
		if (message === "ping") ws.send("pong");
		else ws.send(message);
	};

	private clientConnected = (ws: ServerWebSocket<WebsocketClientData>) => {
		console.log("WebSocket connection opened");
		const global = this.channels.get("global");
		const client = new Client(ws.data.id, ws);
		if (global) global.addMember(client);
	};

	private clientDisconnected = (ws: ServerWebSocket<WebsocketClientData>) => {
		console.log("WebSocket connection closed");
	};
}
