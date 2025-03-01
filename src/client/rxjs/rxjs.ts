import { AsyncSubject, BehaviorSubject, ReplaySubject, Subject, Subscription } from "rxjs";
import { Lib } from "../../utils";
import { Singleton } from "../..";

enum E_SUBJET_TYPE {
	SUBJECT = "subject",
	ASYNC_SUBJECT = "asyncSubject",
	BEHAVIOR_SUBJECT = "behaviorSubject",
	REPLAY_SUBJECT = "replaySubject",
}

export type I_RxjsPayload<T> = {
	cta: string;
	data: T;
	source?: string;
};

export type RxjsNamespaces<T extends string> = T;

export default class Rxjs<T extends string> extends Singleton {
	public namespaces = new Map<string, RxjsInstance>();

	create(namespace: string, subjectType: E_SUBJET_TYPE = E_SUBJET_TYPE.SUBJECT) {
		if (!this.namespaces.has(namespace)) {
			this.namespaces.set(namespace, new RxjsInstance(subjectType));
		}
	}

	registerNamespaces() {
		// register every rxjs namespace as needed
		this.create("system", E_SUBJET_TYPE.BEHAVIOR_SUBJECT);
		this.create("amplitude");
		this.create("modal");
		this.create("utils");
		this.create("toast");
		this.create("selectBox");
		this.create("table");
		this.create("integrations", E_SUBJET_TYPE.BEHAVIOR_SUBJECT);
		this.create("cell", E_SUBJET_TYPE.BEHAVIOR_SUBJECT);
		this.create("appcenter", E_SUBJET_TYPE.BEHAVIOR_SUBJECT);
		this.create("customerCard");
		this.create("statham");
		this.create("pusher");
		this.create("search");
		this.create("views");
		this.create("component_state", E_SUBJET_TYPE.REPLAY_SUBJECT);
		this.create("marketplace");
	}

	next<U>(namespace: RxjsNamespaces<T>, rxjsPayload: I_RxjsPayload<U>): void {
		this.namespaces.get(namespace)?.next(rxjsPayload);
	}

	subscribe(namespace: RxjsNamespaces<T>, listener: (payload: I_RxjsPayload<T>) => any): Subscription {
		const instance = this.namespaces.get(namespace);
		if (!instance) {
			throw new Error(`Namespace ${namespace} not found`);
		}
		return instance.subscribe((payload: I_RxjsPayload<T>) => listener(payload));
	}

	clear(namespace: RxjsNamespaces<T>) {
		this.namespaces.get(namespace)?.clear();
	}
}

export class RxjsInstance {
	subscriptions: Subscription;
	subject: Subject<any>;

	constructor(subjectType: E_SUBJET_TYPE) {
		this.subscriptions = new Subscription();
		switch (subjectType) {
			case E_SUBJET_TYPE.SUBJECT:
				this.subject = new Subject();
				break;
			case E_SUBJET_TYPE.ASYNC_SUBJECT:
				this.subject = new AsyncSubject();
				break;
			case E_SUBJET_TYPE.BEHAVIOR_SUBJECT:
				this.subject = new BehaviorSubject(null);
				break;
			case E_SUBJET_TYPE.REPLAY_SUBJECT:
				this.subject = new ReplaySubject();
				break;
			default:
				this.subject = new Subject();
		}
	}

	next(data: any) {
		this.subject.next(data);
	}

	asObservable() {
		return this.subject.asObservable();
	}

	clear() {
		if (this.subject instanceof ReplaySubject) {
			// Get the current subscribers
			const currentSubscribers = (this.subject as any)._subscribers;

			// Create a new ReplaySubject with same buffer config
			const bufferSize = (this.subject as any)._bufferSize;
			const windowTime = (this.subject as any)._windowTime;
			const newSubject = new ReplaySubject(bufferSize, windowTime);

			// Transfer subscribers to new subject
			newSubject.subscribe(currentSubscribers);

			// Replace the old subject
			this.subject = newSubject;
		}
	}

	set add(subscription: Subscription) {
		this.subscriptions.add(subscription);
	}

	subscribe<U>(callback: (payload: I_RxjsPayload<U>) => void): Subscription {
		if (typeof callback !== "function") {
			throw "Failed to subscribe. Please provide a callback function";
		}

		const subscriber = this.asObservable().subscribe((payload: I_RxjsPayload<U>) => {
			if (Lib.IsNumpty(payload) || !payload.hasOwnProperty("cta")) return;
			callback(payload);
		});

		this.subscriptions.add(subscriber);
		return subscriber;
	}

	unsubscribe() {
		this.subscriptions.unsubscribe();
	}
}
