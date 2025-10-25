import { ServerWebSocket } from "bun";
import type {
	I_WebsocketClient,
	WebsocketEntityData,
	WebsocketChannel,
	WebsocketStructuredMessage,
	I_WebsocketEntity,
	I_WebsocketChannel,
	WebsocketMessageOptions,
	WebsocketMessage,
} from "./websocket.types";
import { E_WebsocketMessageType, E_ClientState } from "./websocket.enums";
import { Guards, Lib } from "../../../utils";
import Message from "./Message";

/**
 * Client - Connected WebSocket client with channel membership
 *
 * ## Channel Membership
 * - Maintains own channel list and handles Bun pub/sub subscriptions
 * - `joinChannel()` adds to channel, subscribes, and handles rollback on failure
 * - Always use `channel.addMember(client)` in application code, not `client.joinChannel()` directly
 *
 * @example
 * // ✅ Correct
 * channel.addMember(client);
 *
 * // ❌ Incorrect - internal use only
 * client.joinChannel(channel);
 */
export default class Client implements I_WebsocketClient {
	private _id: string;
	private _name: string;
	private _ws: ServerWebSocket<WebsocketEntityData>;
	private _channels: WebsocketChannel<I_WebsocketChannel>;
	private _state: E_ClientState;
	private _connectedAt?: Date;
	private _disconnectedAt?: Date;

	private set ws(value: ServerWebSocket<WebsocketEntityData>) {
		this._ws = value;
	}

	public get ws(): ServerWebSocket<WebsocketEntityData> {
		return this._ws;
	}

	private set id(value: string) {
		this._id = value;
	}

	public get id(): string {
		return this._id;
	}

	public get name(): string {
		return this._name;
	}

	private set name(value: string) {
		this._name = value;
	}

	private set channels(value: WebsocketChannel<I_WebsocketChannel>) {
		this._channels = value;
	}

	public get channels(): WebsocketChannel<I_WebsocketChannel> {
		return this._channels;
	}

	public get state(): E_ClientState {
		return this._state;
	}

	constructor(entity: I_WebsocketEntity) {
		this._id = entity.id;
		this._name = entity.name;
		this._ws = entity.ws;
		this._channels = new Map();
		this._state = E_ClientState.CONNECTING;
	}

	public canReceiveMessages(): boolean {
		return this._state === E_ClientState.CONNECTED || this._state === E_ClientState.DISCONNECTING;
	}

	public markConnected(): void {
		this._state = E_ClientState.CONNECTED;
		this._connectedAt = new Date();
	}

	public markDisconnecting(): void {
		this._state = E_ClientState.DISCONNECTING;
	}

	public markDisconnected(): void {
		this._state = E_ClientState.DISCONNECTED;
		this._disconnectedAt = new Date();
	}

	public getConnectionInfo() {
		return {
			id: this.id,
			name: this.name,
			state: this._state,
			connectedAt: this._connectedAt,
			disconnectedAt: this._disconnectedAt,
			uptime: this._connectedAt ? Date.now() - this._connectedAt.getTime() : 0,
			channelCount: this._channels.size,
		};
	}

	/**
	 * HELPER: Track channel on client side (for channel.addMember coordination)
	 * Allows channel to update client's internal channel map
	 * @internal Used by channel.addMember()
	 */
	public trackChannel(channel: I_WebsocketChannel): void {
		this.channels.set(channel.getId(), channel);
	}

	/**
	 * HELPER: Untrack channel on client side (for channel.addMember rollback)
	 * Allows channel to remove from client's internal channel map during rollback
	 * @internal Used by channel.addMember() error handling
	 */
	public untrackChannel(channel: I_WebsocketChannel): void {
		this.channels.delete(channel.getId());
	}

	/**
	 * Join a channel (thin wrapper that delegates to channel.addMember)
	 * channel.addMember() handles all coordination: membership + subscription + tracking + notification
	 */
	public joinChannel(channel: I_WebsocketChannel, send: boolean = true): { success: boolean; reason: string } {
		const channel_id = channel.getId();

		// Check if already joined
		if (this.channels.has(channel_id)) {
			return { success: false, reason: "already_member" };
		}

		// Delegate to channel (which now handles full coordination)
		const result = channel.addMember(this, { notify: send });

		if (!result.success) {
			return { success: false, reason: result.reason };
		}

		return { success: true, reason: "" };
	}

	/**
	 * Leave a channel (thin wrapper that delegates to channel.removeMember)
	 * channel.removeMember() handles all coordination: membership removal + unsubscription + tracking removal + notification
	 */
	public leaveChannel(channel: I_WebsocketChannel, send: boolean = true) {
		const channel_id = channel.getId();

		// Check if we're in the channel
		if (!this.channels.has(channel_id)) {
			return;
		}

		// Delegate to channel (which now handles full coordination)
		channel.removeMember(this, { notify: send });
	}

	public joinChannels(channels: I_WebsocketChannel[], send: boolean = true) {
		channels.forEach((channel) => {
			this.joinChannel(channel, false);
		});
		if (send) this.send({ type: E_WebsocketMessageType.CLIENT_JOIN_CHANNELS, content: { channels }, client: this.whoami() });
	}

	public leaveChannels(channels?: I_WebsocketChannel[], send: boolean = true) {
		if (!channels) channels = Array.from(this.channels.values());
		channels.forEach((channel) => {
			this.leaveChannel(channel, false);
		});
		if (send) this.send({ type: E_WebsocketMessageType.CLIENT_LEAVE_CHANNELS, content: { channels }, client: this.whoami() });
	}

	public whoami(): { id: string; name: string } {
		return { id: this.id, name: this.name };
	}

	public send(message: string, options?: WebsocketMessageOptions): void;
	public send(message: WebsocketStructuredMessage): void;
	public send(message: WebsocketStructuredMessage | string, options?: WebsocketMessageOptions): void {
		// Check state before sending
		if (!this.canReceiveMessages()) {
			Lib.Warn(`Cannot send to client ${this.id} in state ${this._state}`);
			return;
		}

		try {
			if (Guards.IsString(message)) {
				const msg: WebsocketMessage = {
					type: "message",
					content: { message },
				};
				message = Message.Create(msg, options);
			}
			this.ws.send(JSON.stringify({ client: this.whoami(), ...message }));
		} catch (error) {
			Lib.Warn(`Failed to send message to client ${this.id}:`, error);
			if (error instanceof Error && error.message.includes("closed")) {
				this.markDisconnected();
			}
		}
	}

	public subscribe(channel: string): void {
		this.ws.subscribe(channel);
	}

	public unsubscribe(channel: string): void {
		this.ws.unsubscribe(channel);
	}

	public static GetClientType(clients: Map<string, I_WebsocketClient> | undefined): typeof Client {
		if (!clients) return Client;
		if (clients.size > 0) {
			const firstClient = clients.values().next().value;
			if (firstClient) {
				return firstClient.constructor as typeof Client;
			}
		}

		// Fallback to default Client class
		Lib.Warn("Clients map is empty, using default client class");
		return Client;
	}

	public static System() {
		return <WebsocketEntityData>{
			id: "system",
			name: "System",
		};
	}
}
