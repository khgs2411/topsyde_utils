#!/usr/bin/env bun
import { readdir, readFile, writeFile, stat } from "fs/promises";
import { join, dirname, resolve } from "path";
import { existsSync } from "fs";

const DIST_DIR = join(process.cwd(), "dist");

// Regex to match import/export statements
const importExportRegex = /^(\s*(?:import|export)\s+(?:[\s\S]*?from\s+)?['"])([./][\w./\-]+)(['"])/gm;

async function fixImportsInFile(filePath: string): Promise<void> {
  const content = await readFile(filePath, "utf8");

  // Replace imports/exports to add .js extension
  const fixedContent = content.replace(importExportRegex, (match, prefix, importPath, suffix) => {
    // Don't add .js if it already has an extension or if it's a node_modules import
    if (importPath.endsWith('.js') || importPath.endsWith('.json') || !importPath.startsWith('.')) {
      return match;
    }

    // Resolve the full path from the current file's directory
    const currentDir = dirname(filePath);
    const resolvedPath = resolve(currentDir, importPath);

    // Check if this path points to a directory with an index.js file
    const indexJsPath = join(resolvedPath, 'index.js');
    if (existsSync(indexJsPath)) {
      // This is a directory import, add /index.js
      return `${prefix}${importPath}/index.js${suffix}`;
    } else if (existsSync(`${resolvedPath}.js`)) {
      // This is a file import, add .js extension
      return `${prefix}${importPath}.js${suffix}`;
    }

    // Fallback: add .js extension
    return `${prefix}${importPath}.js${suffix}`;
  });

  if (content !== fixedContent) {
    await writeFile(filePath, fixedContent);
    console.log(`Fixed imports in: ${filePath}`);
  }
}

async function processDirectory(dir: string): Promise<void> {
  const entries = await readdir(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.endsWith('.js')) {
      await fixImportsInFile(fullPath);
    }
  }
}

async function main() {
  try {
    console.log("Fixing ESM imports in dist folder...");
    await processDirectory(DIST_DIR);
    console.log("ESM imports fixed successfully!");
  } catch (error) {
    console.error("Error fixing ESM imports:", error);
    process.exit(1);
  }
}

main();