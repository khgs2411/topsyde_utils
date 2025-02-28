import Controller from "../../controller";

export type Routes = {
	[key: string]: new () => Controller;
};

export const routes: Routes = {};
