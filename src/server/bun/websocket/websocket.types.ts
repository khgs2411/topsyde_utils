import { ServerWebSocket, WebSocketHandler } from "bun";
import Channel from "./Channel";

export type WebsocketMessage = string | Buffer<ArrayBufferLike>;

export type WebsocketChannel<T extends I_WebsocketChannel = Channel> = Map<string, T>;

export type WebsocketStructuredMessage<T = any> = {
	type: string;
	content: T;
	channel?: string;
	metadata?: Record<string, string>;
};

export type WebsocketClientData = { id: string; name: string };

export interface I_WebsocketEntity {
	ws: ServerWebSocket<WebsocketClientData>;
	id: string;
	name: string;
}

export interface I_WebsocketClient extends I_WebsocketEntity {
	channels: WebsocketChannel<I_WebsocketChannel>;
	send(message: WebsocketStructuredMessage): any;
	subscribe(channel: string): any;
	joinChannel(channel: I_WebsocketChannel, send?: boolean): void;
	leaveChannel(channel: I_WebsocketChannel, send?: boolean): void;
	joinChannels(channels: I_WebsocketChannel[], send?: boolean): void;
	leaveChannels(channels?: I_WebsocketChannel[], send?: boolean): void;
	unsubscribe(channel: string): any;
	whoami(): WebsocketClientData;
}

export interface I_WebsocketChannel {
	id: string;
	name: string;
	limit: number;
	members: Map<string, I_WebsocketClient>;
	metadata: Record<string, string>;
	createdAt: Date;
	broadcast<T = any, U = any>(message: WebsocketStructuredMessage<U>, ...args: T[]): any;
	hasMember(client: I_WebsocketEntity | string): boolean;
	addMember(entity: I_WebsocketClient): I_WebsocketClient | false;
	removeMember(entity: I_WebsocketEntity): I_WebsocketClient | false;
	getMember(client: I_WebsocketEntity | string): I_WebsocketClient | undefined;
	getMembers(clients?: string[] | I_WebsocketEntity[]): I_WebsocketClient[];
	getMetadata(): Record<string, string>;
	getCreatedAt(): Date;
	getId(): string;
	getSize(): number;
	getLimit(): number;
	getName(): string;
	canAddMember(): boolean;
}

export interface I_WebsocketInterface {
	setup: (channels: WebsocketChannel) => Partial<WebSocketHandler<WebsocketClientData>>;
}
