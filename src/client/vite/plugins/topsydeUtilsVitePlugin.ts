import type { Plugin } from "vite";

/**
 * Creates a Vite plugin that provides compatibility for topsyde-utils in browser environments
 * by disabling sourcemaps and providing mock implementations of Node.js modules.
 */
function topsydeUtilsVitePlugin(): Plugin[] {
	return [
		// Plugin to disable sourcemaps for node_modules
		{
			name: "topsyde-utils:disable-sourcemaps",
			transform(code, id) {
				if (id.includes("node_modules/topsyde-utils")) {
					return {
						code,
						map: { mappings: "" }, // Return empty sourcemap
					};
				}
			},
		},
		// Plugin to provide virtual modules for Node.js built-ins
		{
			name: "topsyde-utils:node-polyfills",
			resolveId(id) {
				if (id === "virtual:path" || id === "virtual:fs") {
					return id;
				}
				return null;
			},
			load(id) {
				if (id === "virtual:path") {
					return `
            export function join() { return ''; }
            export function resolve() { return ''; }
            export function dirname() { return ''; }
            export function basename() { return ''; }
            export function extname() { return ''; }
            export default { join, resolve, dirname, basename, extname };
          `;
				}
				if (id === "virtual:fs") {
					return `
            export function readFileSync() { return ''; }
            export function existsSync() { return false; }
            export function writeFileSync() { return null; }
            export function readdirSync() { return []; }
            export function statSync() { 
              return { 
                isDirectory: () => false,
                isFile: () => true
              }; 
            }
            export default { readFileSync, existsSync, writeFileSync, readdirSync, statSync };
          `;
				}
				return null;
			},
		},
		// Plugin to configure aliases for Node.js modules
		{
			name: "topsyde-utils:aliases",
			config() {
				return {
					resolve: {
						alias: {
							// Alias Node.js built-ins to virtual modules
							path: "virtual:path",
							fs: "virtual:fs",
						},
					},
					optimizeDeps: {
						exclude: ["topsyde-utils"],
					},
				};
			},
		},
	];
}

export default topsydeUtilsVitePlugin;
