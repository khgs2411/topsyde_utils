import { ServerWebSocket, WebSocketHandler } from "bun";
import Channel from "./Channel";
import Websocket from "./Websocket";

export type BunWebsocketMessage = string | Buffer<ArrayBufferLike>;

export type WebsocketChannel<T extends I_WebsocketChannel = Channel> = Map<string, T>;
export type WebsocketClients = Map<string, I_WebsocketClient>;
export type WebsocketMessageOptions = {
	/**
	 * Additional data to include in the message content
	 * If an object is provided, it will be merged with the content
	 * If a primitive value is provided, it will be added as content.data
	 */
	data?: any;

	/**
	 * Client information to include in the message
	 * Will be added as content.client
	 */
	client?: Partial<WebsocketEntityData> & {
		[key: string]: any;
	};

	/**
	 * Channel metadata to include in the message
	 * If true, all metadata will be included
	 * If an array of strings, only the specified keys will be included
	 */
	includeMetadata?: boolean | string[];

	/**
	 * Client IDs to exclude from receiving the broadcast
	 * Useful for sending messages to all clients except the sender
	 */
	excludeClients?: string[];

	/**
	 * Channel to include in the message
	 * Defaults to the channel of the message
	 */
	channel?: string;

	/**
	 * Whether to include timestamp in the message
	 * Defaults to true
	 */
	includeTimestamp?: boolean;

	/**
	 * Custom fields to add to the root of the message
	 * These will be merged with the message object
	 */
	customFields?: Record<string, any>;

	/**
	 * Transform function to modify the final message before sending
	 * This is applied after all other processing
	 */
	transform?: (message: any) => any;

	/**
	 * Priority of the message (higher numbers = higher priority)
	 * Can be used by clients to determine processing order
	 */
	priority?: number;

	/**
	 * Message expiration time in milliseconds since epoch
	 * Can be used by clients to ignore outdated messages
	 */
	expiresAt?: number;

	/**
	 * Metadata to include in the message
	 * If an array of strings, only the specified keys will be included
	 */
	metadata?: boolean | string[] | Record<string, string>;
};

export type WebsocketMessage<T extends Record<string, any> = Record<string, any>> = {
	/**
	 * Message type identifier used for client-side routing
	 */
	type: string;
	/**
	 * Message content - can be any data structure
	 * If a string is provided, it will be wrapped in {message: string}
	 */
	content: T;
	/**
	 * Channel ID
	 */
	channel?: string;
	/**
	 * Any additional custom fields
	 */
	[key: string]: any;
};

export type WebsocketStructuredMessage<T extends Record<string, any> = Record<string, any>> = WebsocketMessage<T> & WebsocketMessageOptions;

export type WebsocketEntityId = string;
export type WebsocketEntityName = string;
export type WebsocketEntityData = { id: WebsocketEntityId; name: WebsocketEntityName };

export interface I_WebsocketEntity extends WebsocketEntityData {
	ws: ServerWebSocket<WebsocketEntityData>;
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
	whoami(): WebsocketEntityData;
}

export interface I_WebsocketChannelEntity<T extends Websocket = Websocket> extends WebsocketEntityData {
	ws: T;
}

// New types for the broadcast method
export type BroadcastOptions = WebsocketMessageOptions & {
	debug?: boolean;
};
export interface I_WebsocketChannel<T extends Websocket = Websocket> extends I_WebsocketChannelEntity<T> {
	limit: number;
	members: Map<string, I_WebsocketClient>;
	metadata: Record<string, string>;
	createdAt: Date;
	broadcast(message: WebsocketStructuredMessage, options?: BroadcastOptions): void;
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

/**
 * Interface for implementing custom WebSocket behavior.
 * 
 * @interface I_WebsocketInterface
 * 
 * @property {Function} setup - Initializes the WebSocket handler with channels and clients
 * 
 * The interface supports three optional handler methods:
 * 
 * - `message`: Custom message handler that replaces the default handler
 * - `open`: Connection handler that runs after the default open handler
 * - `close`: Disconnection handler that runs before the default close handler
 */
export interface I_WebsocketInterface {
	setup: (channels: WebsocketChannel, clients: WebsocketClients) => Partial<WebSocketHandler<WebsocketEntityData>>;
}
