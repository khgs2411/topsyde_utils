import { Guards, Lib } from "../../../utils";
import Message from "./Message";
import Websocket from "./Websocket";
import type {
	BroadcastOptions,
	I_WebsocketChannel,
	I_WebsocketClient,
	I_WebsocketEntity,
	WebsocketChannel,
	WebsocketMessage,
	AddMemberResult,
	AddMemberOptions,
	RemoveMemberOptions,
} from "./websocket.types";
import { E_WebsocketMessageType } from "./websocket.enums";

/**
 * Channel - Pub/sub topic for WebSocket clients
 *
 * ## Membership Contract
 * - `addMember()` validates capacity and adds to `members` map
 * - Client drives join via `joinChannel()` which subscribes and handles rollback
 * - If subscription fails, membership is automatically rolled back
 * - Member count never exceeds `limit`
 *
 * @example
 * const channel = new Channel("game-1", "Game Room", ws, 10);
 * const result = channel.addMember(client);
 * if (result.success) {
 *   channel.broadcast({ type: "player.joined", content: { player: client.whoami() } });
 * }
 */
export default class Channel<T extends Websocket = Websocket> implements I_WebsocketChannel<T> {
	public createdAt: Date = new Date();
	public id: string;
	public name: string;
	public limit: number;
	public members: Map<string, I_WebsocketClient>;
	public metadata: Record<string, string>;
	public ws: T;

	constructor(id: string, name: string, ws: T, limit?: number, members?: Map<string, I_WebsocketClient>, metadata?: Record<string, string>) {
		this.id = id;
		this.name = name;
		this.limit = limit ?? 5;
		this.members = members ?? new Map();
		this.metadata = metadata ?? {};
		this.ws = ws;
	}

	public broadcast(message: WebsocketMessage | string, options?: BroadcastOptions) {
		if (Guards.IsString(message)) {
			const msg: WebsocketMessage = {
				type: "message",
				content: { message },
			};
			message = msg;
		}

		const output = Message.Create(message, { ...options, channel: this.id });

		// Include channel metadata if requested
		if (options?.includeMetadata) {
			output.metadata = options.includeMetadata === true ? this.getMetadata() : this.getFilteredMetadata(options.includeMetadata);
		}

		const serializedMessage = Message.Serialize(output);

		// If we need to exclude clients, send individually to prevent excluded clients from receiving
		if (options?.excludeClients && options.excludeClients.length > 0) {
			const excludeSet = new Set(options.excludeClients); // O(1) lookup

			for (const [clientId, client] of this.members) {
				if (!excludeSet.has(clientId)) {
					try {
						client.ws.send(serializedMessage);
					} catch (error) {
						Lib.Warn(`Failed to send to client ${clientId}:`, error);
					}
				}
			}
			return;
		}

		// Otherwise use pub/sub for everyone
		this.ws.server.publish(this.id, serializedMessage);
	}

	// Helper method for filtered metadata
	private getFilteredMetadata(keys: string[]) {
		const metadata = this.getMetadata();
		const filtered: Record<string, string> = {};

		for (const key of keys) {
			if (metadata[key] !== undefined) {
				filtered[key] = metadata[key];
			}
		}

		return filtered;
	}

	public hasMember(client: I_WebsocketEntity | string) {
		if (typeof client === "string") return this.members.has(client);
		return this.members.has(client.id);
	}

	/**
	 * ATOMIC: Add member to channel (membership only, no side effects)
	 * Internal method used for rollback-safe operations
	 * @internal
	 */
	private addToMembersMap(client: I_WebsocketClient, options?: AddMemberOptions): AddMemberResult {
		// Check if already a member
		if (this.members.has(client.id)) {
			return { success: false, reason: "already_member" };
		}

		// Check capacity
		if (!this.canAddMember()) {
			// Optionally notify client why they can't join
			if (options?.notify_when_full) {
				this.notifyChannelFull(client);
			}
			return { success: false, reason: "full" };
		}

		try {
			this.members.set(client.id, client);
			return { success: true, client };
		} catch (error) {
			// Rollback
			this.members.delete(client.id);
			return {
				success: false,
				reason: "error",
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}

	/**
	 * Add a client to this channel with full coordination
	 * Handles: membership + WebSocket subscription + client-side tracking + optional notification
	 * This ensures two-way coordination between channel and client
	 */
	public addMember(client: I_WebsocketClient, options?: AddMemberOptions): AddMemberResult {
		// 1. Atomic membership add
		const result = this.addToMembersMap(client, options);
		if (!result.success) {
			return result;
		}

		try {
			// 2. Subscribe client's WebSocket to channel pub/sub topic
			// CRITICAL: Without this, client won't receive channel.broadcast() messages
			client.subscribe(this.id);

			// 3. Track channel on client side (client's channels map)
			client.trackChannel(this);

			// 4. Optional welcome notification
			if (options?.notify) {
				client.send({
					type: E_WebsocketMessageType.CLIENT_JOIN_CHANNEL,
					content: { message: "Welcome to the channel" },
					channel: this.id,
					client: client.whoami(),
				});
			}

			return result;
		} catch (error) {
			// Rollback on failure: remove membership + unsubscribe + untrack
			this.removeFromMembersMap(client);
			client.unsubscribe(this.id);
			client.untrackChannel(this);
			throw error;
		}
	}

	public addMembers(clients: I_WebsocketClient[], options?: AddMemberOptions): AddMemberResult[] {
		const results: AddMemberResult[] = [];
		for (const client of clients) {
			const result = this.addMember(client, options);
			results.push(result);
			if (!result.success) {
				// Stop adding further members on failure
				break;
			}
		}
		return results;
	}

	private notifyChannelFull(client: I_WebsocketClient): void {
		client.send({
			type: E_WebsocketMessageType.ERROR,
			content: {
				message: `Channel "${this.name}" is full (${this.limit} members)`,
				code: "CHANNEL_FULL",
				channel: this.id,
			},
		});
	}

	/**
	 * Internal method to remove a member without triggering client-side cleanup.
	 * Used for rollback operations when joinChannel fails.
	 * @internal
	 */
	public removeFromMembersMap(client: I_WebsocketClient): void {
		this.members.delete(client.id);
	}

	/**
	 * Remove a client from this channel with full coordination
	 * Handles: membership removal + WebSocket unsubscription + client-side tracking removal + optional notification
	 * This ensures two-way coordination between channel and client
	 */
	public removeMember(entity: I_WebsocketEntity, options?: RemoveMemberOptions) {
		// 1. Check if member exists
		if (!this.members.has(entity.id)) return false;
		const client = this.members.get(entity.id);
		if (!client) return false;

		// 2. Remove from channel members (atomic operation)
		this.removeFromMembersMap(client);

		// 3. Unsubscribe client's WebSocket from channel pub/sub topic
		client.unsubscribe(this.id);

		// 4. Untrack channel on client side (remove from client's channels map)
		client.untrackChannel(this);

		// 5. Optional goodbye notification
		if (options?.notify) {
			client.send({
				type: E_WebsocketMessageType.CLIENT_LEAVE_CHANNEL,
				content: { message: "You left the channel" },
				channel: this.id,
				client: client.whoami(),
			});
		}

		return client;
	}

	public getMember(client: I_WebsocketEntity | string) {
		if (typeof client === "string") return this.members.get(client);
		return this.members.get(client.id);
	}

	public getMembers(clients?: string[] | I_WebsocketEntity[]): I_WebsocketClient[] {
		if (!clients) return Array.from(this.members.values());
		return clients.map((client) => this.getMember(client)).filter((client) => client !== undefined) as I_WebsocketClient[];
	}

	public getMetadata() {
		return this.metadata;
	}

	public getCreatedAt() {
		return this.createdAt;
	}

	public getId() {
		return this.id;
	}

	public getName() {
		return this.name;
	}

	public getLimit() {
		return this.limit;
	}

	public getSize() {
		return this.members.size;
	}

	public canAddMember() {
		const size = this.getSize();
		return size < this.limit;
	}

	public delete() {
		//first remove all members
		this.members.forEach((member) => {
			this.removeMember(member, { notify: true });
		});
		//then clear members map
		this.members.clear();
	}

	public static GetChannelType(channels: WebsocketChannel<I_WebsocketChannel> | undefined) {
		if (!channels) return Channel;
		if (channels.size > 0) {
			const firstChannel = channels.values().next().value;
			if (firstChannel) {
				return firstChannel.constructor as typeof Channel;
			} else {
				return Channel;
			}
		} else {
			Lib.Warn("Channels are empty, using default channel class");
			return Channel;
		}
	}
}
