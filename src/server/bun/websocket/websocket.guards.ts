import { WebsocketStructuredMessage } from "./websocket.types";

export function IsWebsocketStructuredMessage(message: any): message is WebsocketStructuredMessage {
	return typeof message === "object" && message !== null && "type" in message && "content" in message;
}

