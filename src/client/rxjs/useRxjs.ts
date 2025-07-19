import { Subscription } from "rxjs";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Guards, Lib } from "../../utils";
import { I_RxjsPayload, Rxjs, RxjsNamespaces } from "../../utils/Rxjs";

export type RxjsDataType = string | Record<string, any>;
export type NamespaceActions = Record<string, (data: any) => void>;
export type MultiNamespaceActions<T extends string> = Partial<Record<RxjsNamespaces<T>, NamespaceActions>>;

export const useRxjs = <T extends string>(
	_namespace: RxjsNamespaces<T> | RxjsNamespaces<T>[],
	actions?: NamespaceActions | MultiNamespaceActions<T>,
	options?: { static_instance: boolean },
) => {
	const subs = ref<Map<RxjsNamespaces<T>, Subscription>>(new Map());
	const _actions = ref(actions);
	const instance = Rxjs.GetInstance<Rxjs<T>>();
	const namespaces = ref<RxjsNamespaces<T>[]>(Guards.IsArray(_namespace) ? _namespace : [_namespace]);

	namespaces.value.forEach((ns) => {
		if (instance.has(ns)) return;
		console.log("Creating namespace", ns);
		instance.create(ns);
	});

	function _getAction(cta: string, ns: RxjsNamespaces<T>) {
		if (Guards.IsArray(_namespace)) return _actions.value?.[ns]?.[cta];
		return _actions.value?.[cta];
	}

	function $next(namespace: RxjsNamespaces<T>, payload: I_RxjsPayload<any>): void;
	function $next(cta: string, data: RxjsDataType): void;
	function $next(firstParam: RxjsNamespaces<T> | string, secondParam: I_RxjsPayload<RxjsDataType> | any): void {
		if (typeof firstParam !== "string" && secondParam && typeof secondParam === "object" && "cta" in secondParam && "data" in secondParam) {
			const ns = firstParam;
			const payload: I_RxjsPayload<any> = secondParam;
			instance.next(ns, payload);
			return;
		}

		const cta = firstParam as string;
		const data = secondParam as RxjsDataType;
		const namespaces = Guards.IsArray(_namespace) ? _namespace : [_namespace];
		namespaces.forEach((ns) => {
			instance.next(ns, { cta, data });
		});
	}

	function $clear(namespace: RxjsNamespaces<T>) {
		instance.clear(namespace);
	}

	function $subscribe(actions: NamespaceActions | MultiNamespaceActions<T>) {
		_actions.value = actions;
		$unsubscribe(); // Clear existing subscriptions

		const namespaces = Guards.IsArray(_namespace) ? _namespace : [_namespace];

		namespaces.forEach((ns) => {
			if (!instance.namespaces.has(ns)) {
				Lib.Warn(`Rxjs namespace ${ns} does not exist`);
				return;
			}

			if (subs.value.has(ns)) return;

			subs.value.set(
				ns,
				instance.subscribe(ns, ({ cta, data }) => {
					const action = _getAction(cta, ns) || (() => {});
					action(data);
				}),
			);
		});
	}

	function $unsubscribe() {
		subs.value.forEach((sub) => sub.unsubscribe());
		subs.value.clear();
	}

	function $mount() {
		if (subs.value.size > 0 || !actions) return;
		$subscribe(actions);
	}

	function $unmount() {
		$unsubscribe();
	}

	if (!options?.static_instance) {
		onMounted(() => {
			$mount();
		});
	}

	if (!options?.static_instance) {
		onBeforeUnmount(() => {
			$unmount();
		});
	}

	return {
		$next,
		$clear,
		$subscribe,
		$unsubscribe,
		$mount,
		$unmount,
	};
};
