import { AsyncSubject, BehaviorSubject, ReplaySubject, Subject, Subscription } from "rxjs";
import Singleton from "../singleton";
import Lib from "./Lib";

export { AsyncSubject, BehaviorSubject, ReplaySubject, Subject, Subscription } from "rxjs";

export enum E_SUBJET_TYPE {
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

export class Rxjs<T extends string> extends Singleton {
	public namespaces = new Map<string, RxjsInstance>();

	create(namespace: string, subjectType: E_SUBJET_TYPE = E_SUBJET_TYPE.SUBJECT) {
		if (!this.namespaces.has(namespace)) {
			this.namespaces.set(namespace, new RxjsInstance(subjectType));
		}
	}

	has(namespace: string) {
		return this.namespaces.has(namespace);
	}

	next<U>(namespace: RxjsNamespaces<T>, rxjsPayload: I_RxjsPayload<U>): void {
		this.namespaces.get(namespace)?.next(rxjsPayload);
	}

	subscribe<U>(namespace: RxjsNamespaces<T>, listener: (payload: I_RxjsPayload<U>) => any): Subscription {
		const instance = this.namespaces.get(namespace);
		if (!instance) {
			throw new Error(`Namespace ${namespace} not found`);
		}
		return instance.subscribe((payload: I_RxjsPayload<U>) => listener(payload));
	}

	clear(namespace: RxjsNamespaces<T>) {
		this.namespaces.get(namespace)?.clear();
	}

	public static Next<T extends string, U>(namespace: RxjsNamespaces<T>, rxjsPayload: I_RxjsPayload<U>): void {
		const rxjs = Rxjs.GetInstance<Rxjs<T>>();
		rxjs.create(namespace);
		rxjs.next(namespace, rxjsPayload);
	}

	public static Subscribe<T extends string, U>(namespace: RxjsNamespaces<T>, listener: (payload: I_RxjsPayload<U>) => any): Subscription {
		const rxjs = Rxjs.GetInstance<Rxjs<T>>();
		rxjs.create(namespace);
		return rxjs.subscribe(namespace, listener);
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
