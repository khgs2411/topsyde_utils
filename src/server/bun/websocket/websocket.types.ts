import { ServerWebSocket } from "bun";
import Channel from "./Channel";

export interface I_WebsocketClient {
	ws: ServerWebSocket<WebsocketClientData>;
	id: string;
}

export type WebsocketClientData = {
	id: string;
};

export type WebsocketMessage = string | Buffer<ArrayBufferLike>;
export type WebsocketStructuredMessage = {
	type: string;
	data: any;
};
export type WebsocketChannel<T extends Channel = Channel> = Map<string, T>;
