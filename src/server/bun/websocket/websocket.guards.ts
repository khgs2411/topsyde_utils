import { I_WebsocketClient, I_WebsocketEntity, WebsocketStructuredMessage } from "./websocket.types";
import { type ServerWebSocket } from "bun";

export function IsWebsocketStructuredMessage(message: any): message is WebsocketStructuredMessage {
	return typeof message === "object" && message !== null && "type" in message && "content" in message;
}

export function IsWebsocketEntity(entity: any): entity is I_WebsocketEntity {
	return (
		typeof entity === "object" &&
		entity !== null &&
		"id" in entity &&
		"name" in entity &&
		"ws" in entity &&
		typeof entity.ws === "object" &&
		entity.ws !== null &&
		"send" in entity.ws &&
		typeof entity.ws.send === "function" &&
		"close" in entity.ws &&
		typeof entity.ws.close === "function"
	);
}
