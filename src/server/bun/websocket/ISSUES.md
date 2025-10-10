# WebSocket Framework Issues & Improvements

This document outlines identified issues in the WebSocket framework implementation and proposed solutions.

---

## Critical Issues

### Issue #3: Circular Dependency - Channel ↔ Client Interaction

**Location:** [Channel.ts:87-91](Channel.ts#L87-L91), [Client.ts:62-73](Client.ts#L62-L73)

**Problem:**
The interaction between `Channel.addMember()` and `Client.joinChannel()` creates a circular dependency that's fragile and error-prone:

1. `channel.addMember(client)` calls `client.joinChannel(this)`
2. `client.joinChannel(channel)` subscribes to the channel and sends a message
3. If any step fails (subscription, message send), the channel state and client state become inconsistent

**Current Flow:**
```typescript
// Channel.ts
public addMember(client: I_WebsocketClient) {
    if (!this.canAddMember()) return false;
    this.members.set(client.id, client);  // State changed
    client.joinChannel(this);             // But this could fail
    return client;
}

// Client.ts
public joinChannel(channel: I_WebsocketChannel, send: boolean = true) {
    this.subscribe(channel_id);           // Could fail
    this.channels.set(channel_id, channel);
    if (send) this.send({...});           // Could fail
}
```

**Issues:**
- No rollback if `joinChannel()` fails
- No error propagation
- State becomes inconsistent between channel and client
- Tight coupling makes testing difficult

**Solution - Decoupled Responsibility (Recommended):**
```typescript
// Channel.ts - Channel only manages membership
public addMember(client: I_WebsocketClient): boolean {
    if (!this.canAddMember()) {
        return false;
    }

    if (this.members.has(client.id)) {
        return false; // Already a member
    }

    this.members.set(client.id, client);
    return true;
}

// Add internal method for rollback
public removeMemberInternal(client: I_WebsocketClient): void {
    this.members.delete(client.id);
}

// Client.ts - Client manages its own channel list
public joinChannel(channel: I_WebsocketChannel): boolean {
    const channel_id = channel.getId();

    if (this.channels.has(channel_id)) {
        return false; // Already joined
    }

    // Try to add to channel first
    if (!channel.addMember(this)) {
        return false; // Channel full or other issue
    }

    try {
        this.subscribe(channel_id);
        this.channels.set(channel_id, channel);

        this.send({
            type: E_WebsocketMessageType.CLIENT_JOIN_CHANNEL,
            content: { message: "Welcome to the channel" },
            channel: channel_id,
            client: this.whoami(),
        });

        return true;
    } catch (error) {
        // Rollback channel membership
        channel.removeMemberInternal(this);
        throw error;
    }
}

// Websocket.ts - Coordinator handles high-level flow
private clientConnected = (ws: ServerWebSocket<WebsocketEntityData>) => {
    const global = this._channels.get("global");
    if (!global) throw new Error("Global channel not found");

    const client = Websocket.CreateClient({ id: ws.data.id, ws: ws, name: ws.data.name });
    this._clients.set(client.id, client);

    // Client handles its own joining logic
    if (!client.joinChannel(global)) {
        Lib.Warn(`Failed to add client ${client.id} to global channel`);
    }
};
```

---

### Issue #5: Broadcast Optimization Logic Flaw

**Location:** [Channel.ts:50-62](Channel.ts#L50-L62)

**Problem:**
The broadcast method has a "smart" optimization that switches between pub/sub and individual sends based on arbitrary thresholds:

```typescript
if (this.members.size > 10 && options.excludeClients.length > this.members.size / 3) {
    // Send individually
    const serializedMessage = this.message.serialize(output);
    for (const [clientId, client] of this.members) {
        if (!options.excludeClients.includes(clientId)) {
            client.ws.send(serializedMessage);
        }
    }
    return;
}
// Otherwise use pub/sub
this.ws.server.publish(this.id, this.message.serialize(output));
```

**Issues:**
1. **Arbitrary thresholds** - Why 10 members? Why 33%? No justification
2. **Performance assumptions** - Individual sends may not be faster than pub/sub + client filtering
3. **Inconsistent behavior** - Sometimes uses pub/sub, sometimes doesn't
4. **CRITICAL BUG: Excluded clients still receive via pub/sub** - The pub/sub path ignores `excludeClients` entirely!
5. **O(n²) complexity** - `excludeClients.includes()` is O(n) inside a loop

**Most Critical:** When you use the pub/sub path, excluded clients STILL receive the message.

**Solution - Always Use Individual Sends When Filtering:**
```typescript
public broadcast(message: WebsocketMessage | string, options?: BroadcastOptions) {
    if (Guards.IsString(message)) {
        message = { type: "message", content: { message } };
    }

    const output = this.message.create(message, { ...options, channel: this.id });

    if (options?.includeMetadata) {
        output.metadata = options.includeMetadata === true
            ? this.getMetadata()
            : this.getFilteredMetadata(options.includeMetadata);
    }

    const serializedMessage = this.message.serialize(output);

    // If we need to exclude clients, send individually
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
```

**Alternative - Make Optimization Configurable:**
```typescript
// In Channel constructor or options
export type ChannelOptions = {
    broadcastStrategy?: 'pubsub' | 'individual' | 'auto';
    autoThreshold?: { minMembers: number; excludeRatio: number };
};

public broadcast(message: WebsocketMessage | string, options?: BroadcastOptions) {
    // ... message preparation ...

    const strategy = this.options?.broadcastStrategy ?? 'auto';
    const shouldSendIndividually =
        strategy === 'individual' ||
        (options?.excludeClients && options.excludeClients.length > 0) ||
        (strategy === 'auto' && this.shouldUseIndividualSends(options));

    if (shouldSendIndividually) {
        this.broadcastIndividual(serializedMessage, options?.excludeClients);
    } else {
        this.ws.server.publish(this.id, serializedMessage);
    }
}

private shouldUseIndividualSends(options?: BroadcastOptions): boolean {
    if (!options?.excludeClients || options.excludeClients.length === 0) {
        return false;
    }

    const threshold = this.options?.autoThreshold ?? { minMembers: 50, excludeRatio: 0.5 };
    return this.members.size >= threshold.minMembers &&
           options.excludeClients.length > this.members.size * threshold.excludeRatio;
}
```

**Recommended:** Simple approach - always use individual sends when `excludeClients` exists.

---

### Issue #8: Wasteful Message Instance Per Channel

**Location:** [Channel.ts:21](Channel.ts#L21), [Channel.ts:30](Channel.ts#L30)

**Problem:**
Every channel creates its own `Message` instance:
```typescript
private message: Message;

constructor(...) {
    this.message = new Message();
}
```

However, `Message` is completely stateless - it only has a template object that gets cloned:
```typescript
export default class Message {
    private messageTemplate: WebsocketStructuredMessage<any>;

    constructor() {
        this.messageTemplate = { type: "", content: {}, channel: "", timestamp: "" };
    }
}
```

**Issues:**
1. **Memory waste** - If you have 100 channels, you create 100 identical `Message` instances
2. **Unnecessary allocations** - Each instance allocates the same template object
3. **Inconsistent API** - `Message` has static methods (`Message.Create`) but channels use instances

**Solution - Use Static Methods Only:**
```typescript
// Message.ts - Make it a pure utility class
export default class Message {
    // Make template static and shared
    private static readonly MESSAGE_TEMPLATE: WebsocketStructuredMessage<any> = {
        type: "",
        content: {},
        channel: "",
        timestamp: ""
    };

    // Keep constructor private to prevent instantiation
    private constructor() {}

    public static Create(message: WebsocketMessage, options?: WebsocketMessageOptions): WebsocketStructuredMessage {
        // Use static template
        const output = Object.assign({}, Message.MESSAGE_TEMPLATE);

        output.type = message.type;
        output.channel = message.channel || options?.channel || "N/A";

        if (typeof message.content === "string") {
            output.content = { message: message.content };
        } else if (typeof message.content === "object" && message.content !== null) {
            output.content = { ...message.content };
        } else {
            output.content = {};
        }

        if (options) {
            // Add data if provided
            if (options.data !== undefined) {
                if (typeof options.data === "object" && options.data !== null && !Array.isArray(options.data)) {
                    Object.assign(output.content, options.data);
                } else {
                    output.content.data = options.data;
                }
            }

            if (options.client && Guards.IsObject(options.client) && Guards.IsString(options.client.id, true)) {
                output.client = {
                    id: options.client.id,
                    name: options.client.name,
                };
            }

            if (options.includeMetadata !== false) output.metadata = options.metadata;

            if (options.includeTimestamp !== false) {
                output.timestamp = new Date().toISOString();
            } else {
                delete output.timestamp;
            }

            if (options.priority !== undefined) {
                output.priority = options.priority;
            }

            if (options.expiresAt !== undefined) {
                output.expiresAt = options.expiresAt;
            }

            if (options.customFields) {
                Object.assign(output, options.customFields);
            }

            if (options.transform) {
                return options.transform(output);
            }
        } else {
            output.timestamp = new Date().toISOString();
        }

        return output;
    }

    public static Serialize<T = string>(message: WebsocketStructuredMessage, transform?: (message: WebsocketStructuredMessage) => T): string | T {
        return transform ? transform(message) : JSON.stringify(message);
    }

    public static CreateWhisper(message: Omit<WebsocketMessage, "type">, options?: WebsocketMessageOptions) {
        return Message.Create({ ...message, type: "whisper" }, options);
    }
}

// Channel.ts - Remove instance field
export default class Channel<T extends Websocket = Websocket> implements I_WebsocketChannel<T> {
    // Remove: private message: Message;

    constructor(...) {
        // Remove: this.message = new Message();
    }

    public broadcast(message: WebsocketMessage | string, options?: BroadcastOptions) {
        if (Guards.IsString(message)) {
            message = { type: "message", content: { message } };
        }

        // Use static method
        const output = Message.Create(message, { ...options, channel: this.id });

        if (options?.includeMetadata) {
            output.metadata = options.includeMetadata === true
                ? this.getMetadata()
                : this.getFilteredMetadata(options.includeMetadata);
        }

        this.ws.server.publish(this.id, Message.Serialize(output));
    }
}

// Client.ts - Use static methods
public send(message: WebsocketStructuredMessage | string, options?: WebsocketMessageOptions): void {
    if (Guards.IsString(message)) {
        const msg: WebsocketMessage = {
            type: "message",
            content: { message },
        };
        message = Message.Create(msg, options);
    }
    this.ws.send(Message.Serialize({ client: this.whoami(), ...message }));
}
```

---

### Issue #10: Type Confusion - WebsocketStructuredMessage Includes Transport Options

**Location:** [websocket.types.ts:105](websocket.types.ts#L105)

**Problem:**
`WebsocketStructuredMessage` is defined as:
```typescript
export type WebsocketStructuredMessage<T extends Record<string, any> = Record<string, any>> =
    WebsocketMessage<T> & WebsocketMessageOptions;
```

This means transport/processing options like `excludeClients`, `transform`, `includeTimestamp` become part of the message structure. This causes several issues:

1. **Transport options leak into wire format** - Options meant for server-side processing are sent to clients
2. **Type confusion** - Is `WebsocketStructuredMessage` a wire format or an API parameter?
3. **Security risk** - `excludeClients` array is sent over the wire (exposes client IDs)
4. **Bloated messages** - Transform functions, metadata flags, etc. are included in JSON

**Current behavior:**
```typescript
const message: WebsocketStructuredMessage = {
    type: "message",
    content: { text: "Hello" },
    excludeClients: ["user-123", "user-456"],  // ❌ Sent over wire!
    transform: (msg) => msg,                    // ❌ Function in JSON!
    includeMetadata: true,                      // ❌ Internal flag sent!
};
```

**Solution - Separate Wire Format from Processing Options:**

```typescript
// websocket.types.ts

/**
 * Message structure sent over the wire to clients.
 * This is the actual WebSocket payload format.
 */
export type WebsocketMessage<T extends Record<string, any> = Record<string, any>> = {
    /** Message type identifier for client-side routing */
    type: string;

    /** Message payload */
    content: T;

    /** Channel ID where message originated */
    channel?: string;

    /** ISO timestamp when message was created */
    timestamp?: string;

    /** Client information (who sent this) */
    client?: WebsocketEntityData;

    /** Channel metadata (if included) */
    metadata?: Record<string, string>;

    /** Message priority for client-side processing */
    priority?: number;

    /** Expiration timestamp (milliseconds since epoch) */
    expiresAt?: number;

    /** Any additional custom fields */
    [key: string]: any;
};

/**
 * Options for message creation and broadcasting.
 * These are NEVER sent over the wire - only used server-side.
 */
export type WebsocketMessageOptions = {
    /** Additional data to merge into content */
    data?: any;

    /** Client information to include */
    client?: Partial<WebsocketEntityData> & { [key: string]: any };

    /** Channel metadata to include (true = all, array = specific keys) */
    includeMetadata?: boolean | string[];

    /** Client IDs to exclude from broadcast (server-side only) */
    excludeClients?: string[];

    /** Channel identifier */
    channel?: string;

    /** Include timestamp (default: true) */
    includeTimestamp?: boolean;

    /** Custom fields to add to message root */
    customFields?: Record<string, any>;

    /** Transform message before sending (server-side only) */
    transform?: (message: WebsocketMessage) => WebsocketMessage;

    /** Message priority */
    priority?: number;

    /** Message expiration time */
    expiresAt?: number;

    /** Channel metadata to include */
    metadata?: Record<string, string>;
};

/**
 * DEPRECATED: Use WebsocketMessage directly.
 * This type will be removed in the next major version.
 */
export type WebsocketStructuredMessage<T extends Record<string, any> = Record<string, any>> = WebsocketMessage<T>;

export type BroadcastOptions = WebsocketMessageOptions & {
    debug?: boolean;
};
```

**Update Message.Create() to return clean wire format:**

```typescript
// Message.ts
export default class Message {
    public static Create(
        message: Omit<WebsocketMessage, 'timestamp'>,
        options?: WebsocketMessageOptions
    ): WebsocketMessage {
        // Build clean wire format - no transport options included
        const output: WebsocketMessage = {
            type: message.type,
            channel: message.channel || options?.channel || "N/A",
            content: typeof message.content === 'string'
                ? { message: message.content }
                : { ...message.content }
        };

        if (options) {
            // Merge data into content
            if (options.data !== undefined) {
                if (typeof options.data === 'object' && !Array.isArray(options.data)) {
                    Object.assign(output.content, options.data);
                } else {
                    output.content.data = options.data;
                }
            }

            // Add client info (sanitized)
            if (options.client?.id) {
                output.client = {
                    id: options.client.id,
                    name: options.client.name || 'Unknown'
                };
            }

            // Add metadata if requested
            if (options.metadata) {
                output.metadata = options.metadata;
            }

            // Add timestamp (default: true)
            if (options.includeTimestamp !== false) {
                output.timestamp = new Date().toISOString();
            }

            // Add priority if specified
            if (options.priority !== undefined) {
                output.priority = options.priority;
            }

            // Add expiration if specified
            if (options.expiresAt !== undefined) {
                output.expiresAt = options.expiresAt;
            }

            // Add custom fields
            if (options.customFields) {
                Object.assign(output, options.customFields);
            }

            // Apply transform last
            if (options.transform) {
                return options.transform(output);
            }
        } else {
            output.timestamp = new Date().toISOString();
        }

        // Note: excludeClients, includeMetadata flags, etc. are NOT in output
        return output;
    }
}
```

**Migration Plan:**
1. Keep `WebsocketStructuredMessage` as alias to `WebsocketMessage` (deprecated)
2. Update all code to use `WebsocketMessage` directly
3. Remove `WebsocketStructuredMessage` in next major version

---

### Issue #4: Channel Limit Enforcement Issues

**Location:** [Channel.ts:87-92](Channel.ts#L87-L92), [Channel.ts:137-140](Channel.ts#L137-L140)

**Problem:**
The channel limit system has several issues:

```typescript
public addMember(client: I_WebsocketClient) {
    if (!this.canAddMember()) return false;  // Silent failure
    this.members.set(client.id, client);
    client.joinChannel(this);
    return client;  // Returns different types (client or false)
}
```

**Issues:**
1. **Type inconsistency** - Returns `I_WebsocketClient | false`
2. **Silent failure** - No indication WHY the add failed (full? already member? error?)
3. **No overflow handling** - What happens when channel is full? No event, no queue, nothing
4. **Race condition** - `canAddMember()` checked separately from `members.set()`, could overflow between checks
5. **No "waiting list" or "channel full" event** - Clients don't know why they can't join

**Solution - Return Result Object:**

```typescript
// websocket.types.ts
export type AddMemberResult =
    | { success: true; client: I_WebsocketClient }
    | { success: false; reason: 'full' | 'already_member' | 'error'; error?: Error };

// Channel.ts
public addMember(client: I_WebsocketClient): AddMemberResult {
    // Check if already a member
    if (this.members.has(client.id)) {
        return { success: false, reason: 'already_member' };
    }

    // Check capacity (atomic check)
    if (this.members.size >= this.limit) {
        // Notify client why they can't join
        this.notifyChannelFull(client);
        return { success: false, reason: 'full' };
    }

    try {
        this.members.set(client.id, client);
        client.joinChannel(this);
        return { success: true, client };
    } catch (error) {
        // Rollback
        this.members.delete(client.id);
        return {
            success: false,
            reason: 'error',
            error: error instanceof Error ? error : new Error(String(error))
        };
    }
}

private notifyChannelFull(client: I_WebsocketClient): void {
    client.send({
        type: E_WebsocketMessageType.ERROR,
        content: {
            message: `Channel "${this.name}" is full (${this.limit} members)`,
            code: 'CHANNEL_FULL',
            channel: this.id
        }
    });
}

// Update interface
export interface I_WebsocketChannel<T extends Websocket = Websocket> extends I_WebsocketChannelEntity<T> {
    // ... other methods ...
    addMember(entity: I_WebsocketClient): AddMemberResult;
}

// Usage example
const result = channel.addMember(client);
if (!result.success) {
    Lib.Warn(`Failed to add client: ${result.reason}`);
    if (result.reason === 'full') {
        // Maybe add to waiting list or redirect to another channel
    }
}
```

**Alternative - Add Waiting List (Advanced):**

```typescript
export default class Channel<T extends Websocket = Websocket> implements I_WebsocketChannel<T> {
    public members: Map<string, I_WebsocketClient>;
    public waitingList: Map<string, I_WebsocketClient>;
    public limit: number;

    constructor(...) {
        this.waitingList = new Map();
    }

    public addMember(client: I_WebsocketClient, skipQueue: boolean = false): AddMemberResult {
        if (this.members.has(client.id)) {
            return { success: false, reason: 'already_member' };
        }

        // If channel is full and not skipping queue, add to waiting list
        if (this.members.size >= this.limit && !skipQueue) {
            this.waitingList.set(client.id, client);
            client.send({
                type: E_WebsocketMessageType.CHANNEL_QUEUE,
                content: {
                    message: `Channel is full. Position in queue: ${this.waitingList.size}`,
                    position: this.waitingList.size,
                    channel: this.id
                }
            });
            return { success: false, reason: 'full', queued: true };
        }

        this.members.set(client.id, client);
        client.joinChannel(this);
        return { success: true, client };
    }

    public removeMember(entity: I_WebsocketEntity): I_WebsocketClient | false {
        const client = this.members.get(entity.id);
        if (!client) return false;

        client.leaveChannel(this);
        this.members.delete(entity.id);

        // Process waiting list
        this.processWaitingList();

        return client;
    }

    private processWaitingList(): void {
        if (this.waitingList.size === 0) return;
        if (this.members.size >= this.limit) return;

        // Add first client from waiting list
        const nextClient = this.waitingList.values().next().value;
        if (nextClient) {
            this.waitingList.delete(nextClient.id);
            this.addMember(nextClient, true); // Skip queue check
        }
    }
}
```

---

## Improvements & Recommendations

### Improvement #1: Document Client ↔ Channel Interaction Contract

**Problem:**
The interaction between `Client` and `Channel` is implicit and confusing. Developers extending these classes don't have clear guidance on:
- Who is responsible for what?
- What are the guarantees?
- What order do things happen?
- What can fail and how?

**Solution - Add Comprehensive JSDoc:**

```typescript
/**
 * Channel represents a pub/sub topic for WebSocket clients.
 *
 * ## Membership Contract
 *
 * ### Adding Members
 * The channel-client relationship follows this contract:
 *
 * 1. Channel validates capacity (`canAddMember()`)
 * 2. Channel adds client to `members` map
 * 3. Channel calls `client.joinChannel(this)`
 * 4. Client subscribes to channel topic via Bun's pub/sub
 * 5. Client adds channel to its `channels` map
 * 6. Client sends join notification (if `send=true`)
 *
 * ### Removing Members
 *
 * 1. Channel removes client from `members` map
 * 2. Channel calls `client.leaveChannel(this)`
 * 3. Client removes channel from its `channels` map
 * 4. Client unsubscribes from channel topic
 * 5. Client sends leave notification (if `send=true`)
 *
 * ### Guarantees
 *
 * - If `addMember()` returns success, the client IS subscribed to the channel
 * - If `removeMember()` completes, the client IS unsubscribed from the channel
 * - Channel member count never exceeds `limit`
 * - A client can be a member of multiple channels
 *
 * ### Error Handling
 *
 * - If subscription fails, membership is rolled back
 * - If send fails, membership remains (message delivery is not guaranteed)
 * - All state changes are atomic
 *
 * @example
 * ```typescript
 * const channel = new Channel("game-1", "Game Room 1", ws, 10);
 * const result = channel.addMember(client);
 * if (result.success) {
 *   channel.broadcast({ type: "player.joined", content: { player: client.whoami() } });
 * }
 * ```
 */
export default class Channel<T extends Websocket = Websocket> implements I_WebsocketChannel<T> {
    // ...
}

/**
 * Client represents a connected WebSocket client.
 *
 * ## Channel Membership
 *
 * Clients maintain their own list of joined channels and handle
 * subscription to Bun's pub/sub topics.
 *
 * ### Join Flow
 *
 * When `joinChannel()` is called:
 * 1. Client validates it's not already a member
 * 2. Client subscribes to channel's pub/sub topic
 * 3. Client adds channel to `channels` map
 * 4. Client sends join notification (optional)
 *
 * ⚠️ NOTE: `joinChannel()` is typically called BY the channel,
 * not directly by user code. Use `channel.addMember(client)` instead.
 *
 * @example
 * ```typescript
 * // ✅ Correct: Let channel manage membership
 * channel.addMember(client);
 *
 * // ❌ Incorrect: Don't call directly
 * client.joinChannel(channel);
 * ```
 */
export default class Client implements I_WebsocketClient {
    /**
     * Join a channel.
     *
     * ⚠️ INTERNAL USE: This is called by `Channel.addMember()`.
     * Do not call directly unless you know what you're doing.
     *
     * @param channel - The channel to join
     * @param send - Whether to send join notification (default: true)
     * @internal
     */
    public joinChannel(channel: I_WebsocketChannel, send: boolean = true) {
        // ...
    }
}
```

---

### Improvement #2: Add JSDoc Comments for Static vs Instance Method Patterns

**Problem:**
The `Websocket` class exposes both static and instance methods, which is confusing:

```typescript
// Static
Websocket.Broadcast(channel, message);
Websocket.GetClient(id);

// Instance (via singleton)
const ws = Websocket.GetInstance<Websocket>();
ws.createChannel(id, name);
```

It's unclear which to use when.

**Solution - Add Comprehensive JSDoc:**

```typescript
/**
 * Websocket is a singleton that manages WebSocket clients, channels, and message routing.
 *
 * ## API Design: Static vs Instance Methods
 *
 * This class uses a **Static Facade Pattern** where:
 *
 * ### Static Methods (Public API)
 * Use these in your application code. They provide a convenient, stateless interface:
 * ```typescript
 * Websocket.Broadcast("global", { type: "announcement", content: { message: "Hello" } });
 * const client = Websocket.GetClient("user-123");
 * Websocket.CreateChannel("lobby", "Game Lobby", 50);
 * ```
 *
 * Static methods internally call the singleton instance:
 * ```typescript
 * public static Broadcast(...) {
 *     const ws = this.GetInstance<Websocket>();
 *     ws._channels.get(channel)?.broadcast(message);
 * }
 * ```
 *
 * ### Instance Methods (Internal/Extension API)
 * Use these when extending the class or needing direct instance access:
 * ```typescript
 * class MyWebsocket extends Websocket {
 *     protected createClient(entity: I_WebsocketEntity) {
 *         // Custom client creation
 *         return new MyCustomClient(entity);
 *     }
 * }
 * ```
 *
 * ### When to Use Which?
 *
 * ✅ **Use Static Methods When:**
 * - You're in application/business logic
 * - You want simple, direct API calls
 * - You don't need to extend the class
 *
 * ✅ **Use Instance Methods When:**
 * - You're extending `Websocket` class
 * - You need to override behavior
 * - You're writing internal framework code
 *
 * @example
 * ```typescript
 * // Application code - use static methods
 * Websocket.Broadcast("lobby", { type: "chat", content: { message: "Hi!" } });
 * const client = Websocket.GetClient("user-1");
 *
 * // Extension code - use instance methods
 * class GameWebsocket extends Websocket {
 *     protected createClient(entity: I_WebsocketEntity) {
 *         return new GameClient(entity);
 *     }
 * }
 * ```
 */
export default class Websocket extends Singleton {
    /**
     * Broadcast a message to a specific channel.
     *
     * This is a **static facade method** for convenient access.
     * Internally calls the singleton instance.
     *
     * @param channel - The channel ID
     * @param message - The message to broadcast
     * @param args - Additional arguments (deprecated)
     *
     * @throws {Error} If websocket server is not set
     *
     * @example
     * ```typescript
     * Websocket.Broadcast("game-1", {
     *     type: "game.update",
     *     content: { score: 100 }
     * });
     * ```
     */
    public static Broadcast(channel: string, message: WebsocketStructuredMessage, ...args: any[]) {
        // ...
    }

    /**
     * Create a client instance.
     *
     * This is an **instance method** meant for extension/override.
     * Do not call directly - use static methods instead.
     *
     * @param entity - The client entity data
     * @returns The created client
     *
     * @protected
     * @internal
     *
     * @example
     * ```typescript
     * // ✅ Override in subclass
     * class MyWebsocket extends Websocket {
     *     protected createClient(entity: I_WebsocketEntity) {
     *         return new MyCustomClient(entity);
     *     }
     * }
     * ```
     */
    protected createClient(entity: I_WebsocketEntity): I_WebsocketClient {
        // ...
    }
}
```

---

### Improvement #3: Add Client State Management

**Problem:**
Clients have no explicit state tracking. You can't tell if a client is:
- Connecting
- Connected
- Disconnecting
- Disconnected

This makes it hard to:
- Prevent sending to disconnected clients
- Implement graceful shutdown
- Handle reconnection logic
- Debug connection issues

**Solution - Add Explicit State Management:**

```typescript
// websocket.enums.ts
export enum E_ClientState {
    CONNECTING = "connecting",
    CONNECTED = "connected",
    DISCONNECTING = "disconnecting",
    DISCONNECTED = "disconnected",
}

// Client.ts
export default class Client implements I_WebsocketClient {
    private _id: string;
    private _name: string;
    private _ws: ServerWebSocket<WebsocketEntityData>;
    private _channels: WebsocketChannel<I_WebsocketChannel>;
    private _state: E_ClientState;
    private _connectedAt?: Date;
    private _disconnectedAt?: Date;

    constructor(entity: I_WebsocketEntity) {
        this._id = entity.id;
        this._name = entity.name;
        this._ws = entity.ws;
        this._channels = new Map();
        this._state = E_ClientState.CONNECTING;
    }

    public get state(): E_ClientState {
        return this._state;
    }

    public canReceiveMessages(): boolean {
        return this._state === E_ClientState.CONNECTED;
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
            Lib.Error(`Failed to send message to client ${this.id}:`, error);
            if (error instanceof Error && error.message.includes('closed')) {
                this.markDisconnected();
            }
        }
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
}

// Websocket.ts - Update handlers
private clientConnected = (ws: ServerWebSocket<WebsocketEntityData>) => {
    const client = Websocket.CreateClient({ id: ws.data.id, ws: ws, name: ws.data.name });
    this._clients.set(client.id, client);

    client.send({
        type: E_WebsocketMessageType.CLIENT_CONNECTED,
        content: { message: "Welcome to the server", client: client.whoami() }
    });

    const global = this._channels.get("global");
    if (global) global.addMember(client);

    // Mark as fully connected
    client.markConnected();

    if (this._ws_interface_handlers.open) this._ws_interface_handlers.open(ws);
};

private clientDisconnected = (ws: ServerWebSocket<WebsocketEntityData>, code: number, reason: string) => {
    const client = this._clients.get(ws.data.id);
    if (!client) return;

    client.markDisconnecting();

    if (this._ws_interface_handlers.close) this._ws_interface_handlers.close(ws, code, reason);

    this._channels.forEach((channel) => {
        channel.removeMember(client);
    });

    client.markDisconnected();
    this._clients.delete(ws.data.id);
};

// Add utility methods
public static GetConnectedClients(): I_WebsocketClient[] {
    const ws = this.GetInstance<Websocket>();
    return Array.from(ws._clients.values()).filter(
        client => client.state === E_ClientState.CONNECTED
    );
}

public static GetClientStats() {
    const ws = this.GetInstance<Websocket>();
    const stats = {
        total: ws._clients.size,
        connecting: 0,
        connected: 0,
        disconnecting: 0,
        disconnected: 0,
    };

    for (const client of ws._clients.values()) {
        switch (client.state) {
            case E_ClientState.CONNECTING: stats.connecting++; break;
            case E_ClientState.CONNECTED: stats.connected++; break;
            case E_ClientState.DISCONNECTING: stats.disconnecting++; break;
            case E_ClientState.DISCONNECTED: stats.disconnected++; break;
        }
    }

    return stats;
}
```

**Benefits:**
- Prevents sending to disconnected clients
- Enables connection metrics/monitoring
- Makes debugging easier
- Supports graceful shutdown
- Foundation for reconnection logic

---

## Summary

### Critical Fixes Needed (Priority Order)
1. **Issue #10** - Separate transport options from wire format (security + API clarity)
2. **Issue #5** - Fix broadcast bug (excludeClients ignored in pub/sub path)
3. **Issue #3** - Refactor circular dependency (architecture issue)
4. **Issue #8** - Remove wasteful Message instances (performance)
5. **Issue #4** - Improve channel limit handling (better UX)

### Recommended Improvements
1. Document Client ↔ Channel interaction contract
2. Add JSDoc for static vs instance method patterns
3. Add client state management (CONNECTING, CONNECTED, etc.)

### Quick Wins (Easy to Implement)
- Issue #8: Change Message to static-only (1 file change)
- Issue #5: Remove broadcast optimization (simplify logic)
- Improvement #2: Add JSDoc comments (documentation only)

### Requires More Thought
- Issue #3: Circular dependency refactor (affects multiple files)
- Issue #10: Type separation (might break existing code)
- Improvement #3: Client state (new feature, needs testing)
