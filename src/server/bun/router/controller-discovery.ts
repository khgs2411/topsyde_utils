import { join } from 'path';
import { readdirSync, statSync } from 'fs';
import { Lib } from '../../../utils';
import { Routes } from './routes';

const fallbackRoutes: Routes = {};

/**
 * Dynamically discovers and loads controllers from the components directory
 */
export class ControllerDiscovery {
	public static async DiscoverRoutes(componentPaths: string[]) {
		try {
			const allDiscoveredRoutes: Routes = {};

			// Discover controllers in all specified component paths
			for (const path of componentPaths) {
				const discoveredRoutes = await ControllerDiscovery.Find(path);

				// Merge discovered routes
				Object.assign(allDiscoveredRoutes, discoveredRoutes);
			}

			// Use discovered routes if any were found, otherwise use fallback
			if (Object.keys(allDiscoveredRoutes).length > 0) {
				Lib.Log(`Using auto-discovered routes from paths: ${componentPaths.join(', ')}`);
				return allDiscoveredRoutes;
			} else {
				Lib.Log('No routes discovered, using fallback routes');
				return fallbackRoutes;
			}
		} catch (error) {
			// If auto-discovery fails, use fallback routes
			Lib.Warn('Controller auto-discovery failed, using fallback routes:', error);
			return fallbackRoutes;
		}
	}

	/**
	 * Discovers controllers in the specified directory
	 * @param componentsPath Optional custom path to components directory (relative to project root)
	 * @returns Routes object with discovered controllers
	 */
	public static async Find(componentsPath?: string): Promise<Routes> {
		const routes: Routes = {};
		
		// Get project root - use process.cwd() to get the root of the project using this library
		const projectRoot = process.cwd();
		
		// Use provided path or default to components directory
		const componentsDir = componentsPath
			? join(projectRoot, componentsPath) // From project root
			: join(projectRoot, 'src', 'components'); // Default location
		
		Lib.Log(`Looking for controllers in: ${componentsDir}`);

		try {
			// Get all component directories
			const componentFolders = readdirSync(componentsDir).filter(folder =>
				statSync(join(componentsDir, folder)).isDirectory()
			);

			// Process each component folder
			for (const componentName of componentFolders) {
				const controllerPath = join(componentsDir, componentName, `${componentName}.controller.ts`);

				try {
					// Check if controller file exists
					const controllerFile = Bun.file(controllerPath);
					if (await controllerFile.exists()) {
						// Import the controller
						try {
							const module = await import(controllerPath);
							const Controller = module.default;

							if (Controller && typeof Controller === 'function') {
								routes[componentName] = Controller;
								Lib.Log(`Registered controller: ${componentName}`);
							}
						} catch (err) {
							Lib.Warn(`Failed to import controller for ${componentName}:`, err);
						}
					}
				} catch (err) {
					Lib.Warn(`Error processing component ${componentName}:`, err);
				}
			}
		} catch (err) {
			Lib.Warn(`Error discovering controllers in ${componentsDir}:`, err);
		}

		return routes;
	}
}
