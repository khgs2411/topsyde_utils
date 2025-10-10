import Axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, isAxiosError } from "axios";
class BaseAPI {
	private api: AxiosInstance;
	protected controller: string;
	protected base_url: string;

	constructor(controller: string, base_url?: string) {
		this.controller = controller;
		this.base_url = base_url || import.meta.env.VITE_HOST || "";
		this.api = this.initAxios();
	}

	private initAxios(): AxiosInstance {
		const config: AxiosRequestConfig = {
			headers: {
				"Content-Type": "application/json",
			},
		};

		const instance = Axios.create(config);

		// Add interceptor to modify request config
		instance.interceptors.request.use((config) => {
			// Ensure the correct content type
			config.headers["Content-Type"] = "application/json";

			return config;
		});

		return instance;
	}

	public static Status(response: AxiosResponse<{ status: boolean }>) {
		if (!response.data.status) throw new Error("Something went wrong");
	}

	/**
	 * @description Axios GET request wrapper
	 * @param endpoint string
	 * @generic T
	 * @returns Promise<AxiosResponse<T>>
	 */
	async get<T extends { status: boolean }>(endpoint: string): Promise<AxiosResponse<T>>;
	/**
	 * @description Axios GET request wrapper
	 * @param controller string - which controller to use
	 * @param endpoint string - controller action to call
	 * @generic T
	 * @returns Promise<AxiosResponse<T>>
	 */
	async get<T extends { status: boolean }>(controller: string, endpoint: string): Promise<AxiosResponse<T>>;
	/**
	 * @description Axios GET request wrapper
	 * @param controller string - which controller to use
	 * @param endpoint string - controller action to call
	 * @param debounceDelay number - debounce delay
	 * @generic T
	 * @returns Promise<AxiosResponse<T>>
	 */
	async get<T extends { status: boolean }>(controller: string, endpoint: string, debounceDelay?: number): Promise<AxiosResponse<T>>;
	async get<T extends { status: boolean }>(controllerOrEndpoint: string, endpoint?: string | undefined, _debounceDelay?: number): Promise<AxiosResponse<T>> {
		let controller = endpoint ? controllerOrEndpoint : this.controller;
		let action = endpoint ? endpoint : controllerOrEndpoint;

		return this.api.get<T>(`${this.base_url}/${controller}/${action}`).catch((err) => {
			if (isAxiosError(err)) throw err.response;
			throw err;
		});
	}

	/**
	 * @description Axios POST request wrapper
	 * @param endpoint string - controller action to call
	 * @param payload any
	 * @generic T
	 * @returns Promise<AxiosResponse<T>>
	 */
	async post<T extends { status: boolean }>(endpoint: string, payload: any): Promise<AxiosResponse<T>>;
	/**
	 * @description Axios POST request wrapper
	 * @param controller string - which controller to use
	 * @param endpoint string - controller action to call
	 * @param payload any
	 * @generic T
	 * @returns Promise<AxiosResponse<T>>
	 */
	async post<T extends { status: boolean }>(controller: string, endpoint: string, payload: any): Promise<AxiosResponse<T>>;
	async post<T extends { status: boolean }>(controllerOrEndpoint: string, endpointOrPayload: string | any, payload?: any): Promise<AxiosResponse<T>> {
		let controller: string;
		let action: string;
		let data: any;

		if (payload !== null && payload !== undefined) {
			controller = controllerOrEndpoint;
			action = endpointOrPayload;
			data = payload;
		} else {
			controller = this.controller;
			action = controllerOrEndpoint;
			data = endpointOrPayload;
		}
		const response = await this.api.post<T>(`${this.base_url}/${controller}/${action}`, data).catch((err) => {
			if (isAxiosError(err)) throw err.response;
			throw err;
		});
		if (!response.data.status) throw new Error("Something went wrong");
		return response;
	}
}

export default BaseAPI;
