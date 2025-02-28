import { LOG_COLORS, LOG_ICONS } from "../consts";

export class Console {
	/**
	 * Print a blank line
	 */
	static blank(): void {
		console.log("");
	}

	/**
	 * Print a success message
	 */
	static success(message: string): void {
		console.log(`  ${LOG_COLORS.text.green}${LOG_ICONS.success}${LOG_COLORS.reset}  ${message}`);
	}

	/**
	 * Print an info message
	 */
	static info(message: string): void {
		console.log(`  ${LOG_COLORS.text.blue}${LOG_ICONS.info}${LOG_COLORS.reset}  ${message}`);
	}

	/**
	 * Print a warning message
	 */
	static warning(message: string): void {
		console.log(`  ${LOG_COLORS.text.yellow}${LOG_ICONS.warning}${LOG_COLORS.reset}  ${message}`);
	}

	/**
	 * Print an error message
	 */
	static error(message: string): void {
		console.log(`  ${LOG_COLORS.text.red}${LOG_ICONS.error}${LOG_COLORS.reset}  ${message}`);
	}

	/**
	 * Print a debug message
	 */
	static debug(message: string): void {
		console.log(`  ${LOG_COLORS.text.magenta}${LOG_ICONS.debug}${LOG_COLORS.reset}  ${message}`);
	}

	/**
	 * Print a list item with an arrow
	 */
	static item(label: string, value: string): void {
		console.log(`  ${LOG_COLORS.text.cyan}${LOG_ICONS.arrow}${LOG_COLORS.reset}  ${LOG_COLORS.bright}${label}:${LOG_COLORS.reset} ${value}`);
	}

	/**
	 * Print a header with optional emoji
	 */
	static header(text: string, emoji?: string): void {
		const icon = emoji ? `${emoji} ` : "";
		console.log(`  ${icon}${LOG_COLORS.bright}${text}${LOG_COLORS.reset}`);
	}

	/**
	 * Print a subheader with dimmed text
	 */
	static subheader(text: string): void {
		console.log(`  ${LOG_COLORS.dim}${text}${LOG_COLORS.reset}`);
	}

	/**
	 * Print a ready message with timing
	 */
	static ready(timeMs: number): void {
		console.log(
			`  ${LOG_COLORS.text.green}✓${LOG_COLORS.reset}  ${LOG_COLORS.dim}Ready in${LOG_COLORS.reset} ${LOG_COLORS.text.cyan}${timeMs}ms${LOG_COLORS.reset}`,
		);
	}

	/**
	 * Get a colored string
	 */
	static colorize(text: string, color: keyof typeof LOG_COLORS.text): string {
		return `${LOG_COLORS.text[color]}${text}${LOG_COLORS.reset}`;
	}
}

export default Console;
