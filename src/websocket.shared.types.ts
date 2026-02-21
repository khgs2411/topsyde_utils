export type WebsocketEntityId = string;
export type WebsocketEntityName = string;
export type WebsocketEntityData = { id: WebsocketEntityId; name: WebsocketEntityName };

export type WebsocketMessage<T extends Record<string, any> = Record<string, any>> = {
	type: string;
	content: T;
	channel?: string;
	timestamp?: string;
	[key: string]: any;
};

export type WebsocketStructuredMessage<T extends Record<string, any> = Record<string, any>> = {
	type: string;
	content: T;
	channel?: string;
	timestamp?: string;
	client?: WebsocketEntityData;
	metadata?: Record<string, string>;
	priority?: number;
	expiresAt?: number;
	[key: string]: any;
};

export function IsWebsocketStructuredMessage(message: any): message is WebsocketStructuredMessage {
	return typeof message === "object" && message !== null && "type" in message && "content" in message;
}
