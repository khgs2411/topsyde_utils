import { ServerWebSocket } from "bun";
import Channel from "./Channel";

export interface I_WebsocketEntity {
	ws: ServerWebSocket<WebsocketClientData>;
	id: string;
}

export interface I_WebsocketClient extends I_WebsocketEntity {
	send(message: WebsocketStructuredMessage): void;
	subscribe(channel: string): void;
	unsubscribe(channel: string): void;
}

export type WebsocketClientData = {
	id: string;
};

export type WebsocketMessage = string | Buffer<ArrayBufferLike>;

export type WebsocketStructuredMessage = {
	type: string;
	content: any;
	channel?: string;
	metadata?: Record<string, string>;
};

export type WebsocketChannel<T extends Channel = Channel> = Map<string, T>;
