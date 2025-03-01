export enum E_WebsocketMessageType {
	CLIENT_CONNECTED = "client.connected",
	CLIENT_DISCONNECTED = "client.disconnected",
	CLIENT_JOIN_CHANNEL = "client.join.channel",
	CLIENT_LEAVE_CHANNEL = "client.leave.channel",
	CLIENT_JOIN_CHANNELS = "client.join.channels",
	CLIENT_LEAVE_CHANNELS = "client.leave.channels",
	PING = "ping",
	PONG = "pong",
	MESSAGE = "message",
	WHISPER = "whisper",
	BROADCAST = "broadcast",
	PROMPT = "prompt",
	ERROR = "error",
	SYSTEM = "system",
}

export enum E_WebsocketMessagePriority {
	LOW = 0,
	MEDIUM = 1,
	HIGH = 2,
}
