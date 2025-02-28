import * as fs from "fs";
import * as path from "path";
import { E_IS } from "../enums";
import Throwable from "../throwable";

class Lib {
	public static Log(...args: any) {
		const timestamp = new Date().toLocaleTimeString();
		console.log(`[${timestamp}]:`, ...args);
	}

	public static LogObject(object: any, text?: string) {
		const timestamp = new Date().toLocaleTimeString();
		console.log(`[${timestamp}]:`, text ?? "", JSON.stringify(object, null, 2));
	}

	public static Warn(...args: any) {
		const timestamp = new Date().toLocaleTimeString();
		console.error(`[${timestamp}] Handled Error: `, ...args);
	}

	public static $Log(...args: any) {
		const timestamp = new Date().toLocaleTimeString();
		console.error(`[${timestamp}]`, ...args);
	}

	public static secondsToMilliseconds(seconds: number): number {
		return seconds * 1000;
	}

	public static minutesToMilliseconds(minutes: number): number {
		return minutes * 60 * 1000;
	}

	public static hoursToMilliseconds(hours: number): number {
		return hours * 60 * 60 * 1000;
	}

	public static GetTimestamp(milliseconds_ago: number) {
		const now = new Date();
		return new Date(now.getTime() - milliseconds_ago);
	}

	public static GetDateTimestamp(date: string | Date, format = "DD/MM/YYYY HH:mm", isUTC = false): number {
		if (typeof date === "string") {
			const formatParts = format.split(/[-\/. :]/);
			const dateParts = date.split(/[-\/. :]/);

			let day: number | undefined;
			let month: number | undefined;
			let year: number | undefined;
			let hours = 0;
			let minutes = 0;

			formatParts.forEach((part, index) => {
				switch (part) {
					case "DD":
					case "dd":
						day = parseInt(dateParts[index], 10);
						break;
					case "MM":
						month = parseInt(dateParts[index], 10) - 1; // Months are 0-based in JavaScript Date
						break;
					case "YYYY":
					case "yyyy":
						year = parseInt(dateParts[index], 10);
						break;
					case "HH":
					case "hh":
						hours = parseInt(dateParts[index], 10);
						break;
					case "mm":
						minutes = parseInt(dateParts[index], 10);
						break;
				}
			});

			if (day === undefined || month === undefined || year === undefined) {
				throw new Error("Invalid date format or date string");
			}

			let dateObj;
			if (isUTC) {
				dateObj = new Date(Date.UTC(year, month, day, hours, minutes));
			} else {
				dateObj = new Date(year, month, day, hours, minutes);
			}
			return dateObj.getTime();
		} else {
			return date.getTime();
		}
	}

	public static calculatePercentage(x: number, y: number): number {
		if (y === 0) {
			throw new Error("The denominator (y) cannot be zero.");
		}
		return x / y;
	}

	public static MYSQLTimestamp(): string {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const seconds = now.getSeconds();

		const formattedDate = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
		const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

		return `${formattedDate} ${formattedTime}`;
	}

	public static FormatUnixToDate(unix_time_stamp: number, in_milliseconds = false): Date {
		const date = new Date(unix_time_stamp * (in_milliseconds ? 1 : 1000));
		return date;
	}

	public static FormatDate(date: Date | string, format = "MM/dd/yyyy"): string {
		try {
			const leadingZero = (value: number) => (value < 10 ? `0${value}` : `${value}`);
			if (!date) throw new Error("Lib.FormatDate() Exception: Date is required");
			if (typeof date === "string") {
				date = new Date(date);
			}
			const day = leadingZero(date.getDate());
			const month = leadingZero(date.getMonth() + 1);
			const year = date.getFullYear();
			const hours = leadingZero(date.getHours());
			const minutes = leadingZero(date.getMinutes());
			const seconds = leadingZero(date.getSeconds());

			let result = format
				.replace(/DD|dd/g, day)
				.replace(/MM/g, month)
				.replace(/yyyy|YYYY/g, year.toString());

			if (format.includes("HH")) {
				result = result.replace(/HH/g, hours);
			}
			if (format.toLowerCase().includes("mm")) {
				result = result.replace(/mm/g, minutes);
			}
			if (format.includes("ss")) {
				result = result.replace(/ss/g, seconds);
			}

			return result;
		} catch (e) {
			throw e;
		}
	}

	public static DaysBetweenDates(startDate: Date | string | undefined, endDate: Date | string | undefined, format = "MM/dd/yyyy"): number {
		if (startDate === null || startDate === undefined || endDate === null || endDate === undefined) {
			throw new Error("Lib.DaysBetweenDates() Exception: Dates are required" + startDate + " " + endDate);
		}
		const start = new Date(this.FormatDate(startDate, format)).getTime();
		const end = new Date(this.FormatDate(endDate, format)).getTime();
		const difference = end - start;
		const daysPassed = difference / (1000 * 3600 * 24);
		return Math.floor(daysPassed);
	}

	public static IsPastDate(date: Date | string, format = "MM/dd/yyyy HH:mm:ss", debug = false, currentDate?: Date | string): boolean {
		const truncateToSecond = (d: Date) => new Date(Math.floor(d.getTime() / 1000) * 1000);

		const now = truncateToSecond(currentDate ? (typeof currentDate === "string" ? new Date(currentDate) : currentDate) : new Date());
		const check = truncateToSecond(typeof date === "string" ? new Date(date) : date);

		if (debug) {
			Debug.Log("Now:", this.FormatDate(now, format));
			Debug.Log("Check:", this.FormatDate(check, format));
		}

		return now.getTime() > check.getTime();
	}

	public static IsPastDateFrom(date: Date | string, from: Date | string, format = "MM/dd/yyyy"): boolean {
		const now = this.FormatDate(from, format);
		const check = this.FormatDate(date, format);
		return new Date(now).getTime() > new Date(check).getTime();
	}

	public static addTimeFromDate(date: Date | string, milliseconds: number): Date {
		const dateObj = new Date(typeof date === "string" ? new Date(date).getTime() : date.getTime() + milliseconds);
		return dateObj;
	}

	public static UUID(minLength = 36): string {
		const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
		let uuid = template.replace(/[xy]/g, function (c) {
			const r = (Math.random() * 16) | 0,
				v = c === "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});

		// If the generated UUID is shorter than the minimum length, pad it with additional random characters
		while (uuid.length < minLength) {
			uuid += ((Math.random() * 16) | 0).toString(16);
		}

		return uuid.substring(0, minLength);
	}

	public static Debounce(callback: (...args: any[]) => void, delay = 500): (...args: any[]) => any {
		let timeout: Timer;
		return (...args: any[]) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				return callback(...args);
			}, delay);
		};
	}

	public static IsNil(value: any): boolean {
		return value === null || value === undefined;
	}

	public static IsPrimitive(value: any): boolean {
		return this.IsNumber(value) || this.IsString(value) || this.IsBoolean(value);
	}

	public static EmptyObject(value: any): boolean {
		let empty_object = true;
		if (this.GetType(value) !== "object") {
			empty_object = false;
			return empty_object;
		}
		if (Object.keys(value).length === 0) {
			empty_object = true;
			return empty_object;
		}
		for (const k in value) {
			if (!this.IsNil(value[k]) && value[k] !== "") {
				empty_object = false;
			}
		}
		return empty_object;
	}

	public static IsNumpty(value: any, _objectsOnly = false): boolean {
		return typeof value === "number" ? false : this.IsNil(value) || this.IsEmpty(value, _objectsOnly);
	}

	public static IsEmpty(value: any, _objectsOnly = false): boolean {
		return (
			(this.GetType(value) === "array" && value.length === 0 && !_objectsOnly) ||
			(this.GetType(value) === "object" && this.EmptyObject(value)) ||
			(typeof value === "string" && value.trim().length === 0)
		);
	}

	public static IsArray(variable: any): boolean {
		return this.GetType(variable) === E_IS.ARRAY;
	}

	public static IsString(variable: any): boolean {
		return this.GetType(variable) === E_IS.STRING;
	}

	public static IsNumber(variable: any): boolean {
		return this.GetType(variable) === E_IS.NUMBER;
	}

	public static IsObject(variable: any): boolean {
		return this.GetType(variable) === E_IS.OBJECT;
	}

	public static IsFunction(variable: any): boolean {
		return this.GetType(variable) === E_IS.FUNCTION;
	}

	public static IsRegex(variable: any): boolean {
		return this.GetType(variable) === E_IS.REGEX;
	}

	public static IsBoolean(variable: any): boolean {
		return this.GetType(variable, true) === E_IS.BOOLEAN;
	}

	public static GetType(value: any, asTypeOf = false): null | string | boolean {
		if (asTypeOf) {
			return typeof value;
		}
		if (value === "0" || value === "1") {
			return "number";
		}
		if (value === true) {
			return true;
		} else if (value === false) {
			return false;
		} else if (value === null || value === undefined) {
			return null;
		} else if (Array.isArray(value)) {
			return "array";
		} else if (value instanceof RegExp) {
			return "regex";
		} else if (!isNaN(Number(value))) {
			return "number";
		} else if (typeof value === "string") {
			return "string";
		} else if ({}.toString.call(value) === "[object Function]" || typeof value === "function") {
			return "function";
		} else {
			return "object";
		}
	}

	public static GetProjectRoot(startDir: string = __dirname, rootReference = "package.json"): string {
		let currentDir = startDir;

		while (!fs.existsSync(path.join(currentDir, rootReference))) {
			const parentDir = path.resolve(currentDir, "..");
			if (parentDir === currentDir) {
				throw new Error("Unable to find project root");
			}
			currentDir = parentDir;
		}

		return currentDir;
	}

	public static async RunTaskWithTimeout(task: () => Promise<void>, timeout: number) {
		return Promise.race([task(), new Promise((_, reject) => setTimeout(() => reject(new Error("Task timed out")), timeout))]);
	}

	public static GetFolderPath(folder: string): string {
		return path.join(this.GetProjectRoot(), folder);
	}

	public static GetFilePath(folder: string, file: string): string {
		return path.join(this.GetFolderPath(folder), file);
	}

	public static async CreateDirectory(folderToCreate: string) {
		const directoryPath = Lib.GetFolderPath(folderToCreate);
		await fs.promises.access(directoryPath, fs.constants.F_OK).catch(async () => {
			await fs.promises.mkdir(directoryPath, { recursive: true });
		});
		return directoryPath;
	}

	public static async DeleteDirectory(folderToDelete: string) {
		const directoryPath = path.join(this.GetProjectRoot(), folderToDelete);
		await fs.promises.rm(directoryPath, { recursive: true, force: true });
	}

	public static async CreateFile(folderPath: string, filePath: string, content: string) {
		await Lib.CreateDirectory(folderPath);
		const file = Lib.GetFilePath(folderPath, filePath);
		await fs.promises.writeFile(file, content, "utf8");
	}

	public static GetFile(filePathFromRoot: string) {
		return fs.createReadStream(filePathFromRoot);
	}

	public static GetFilesInDirectory(directoryPath: string): string[] {
		return fs.readdirSync(directoryPath);
	}

	public static async DeleteFile(filePathFromRoot: string) {
		await fs.promises.unlink(filePathFromRoot);
	}

	public static Timestamp(log = false) {
		const currentTime = new Date().toLocaleTimeString();
		if (log) console.log(`[${currentTime}]`);
		return currentTime;
	}

	public static RemoveWhitespace(value: string): string {
		return value.replace(/\s/g, "");
	}

	public static msToString(ms: number): string {
		if (ms === 0) return "0ms"; // Handle zero duration case
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		let output = hours > 0 ? `${hours}h ` : "";
		output += minutes > 0 ? `${minutes % 60}m ` : "";
		output += seconds % 60 > 0 ? `${seconds % 60}s ` : "";
		output += ms % 1000 > 0 ? `${(ms % 1000).toFixed(2)}ms` : "";
		return output.trim();
	}

	public static FormatPhone(phone_number: string): string {
		let output: string = phone_number;
		//remove all non-digit characters and whitespaces using regex
		output = output.replace(/\D/g, "");
		//if phone number doesn't start with + add +
		if (!output.startsWith("+")) {
			output = `+${output}`;
		}
		return output;
	}

	public static ToMB(bytes: number, as_KB = true, decimalPlaces = 2): string {
		const kb = bytes / 1024;
		return (as_KB ? kb : kb / 1024).toFixed(decimalPlaces);
	}

	public static ToGB(bytes: number, as_KB = true, decimalPlaces = 2): string {
		const mb = this.ToMB(bytes, as_KB, decimalPlaces);
		return (parseInt(mb) / 1024).toFixed(decimalPlaces);
	}

	public static async RetryHandler<T extends (...args: any[]) => any>(func: T, retries = 3, ...args: Parameters<T>): Promise<ReturnType<T>> {
		let attempts = 0;
		let toThrow;

		while (attempts < retries) {
			try {
				return await func(...args);
			} catch (e) {
				attempts++;
				toThrow = e;
				if (attempts <= retries && !Throwable.IsThrowable(e)) {
					Lib.$Log(`Attempt ${attempts} failed. Retrying...(${func.name})`);
					if (attempts == 1) Lib.Warn(toThrow);
					// Lib.Warn(toThrow, { hint: `Attempt ${attempts} failed. Retrying...(${func.name})`, data: JSON.stringify(args) });
					// Wait for 1 second before retrying
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
		}

		throw toThrow;
	}

	public static Difference(x: any[], y: any[]) {
		return x.filter((x) => !y.includes(x));
	}

	public static async ReadFileContent(filePath: string): Promise<string> {
		return fs.promises.readFile(filePath, "utf8");
	}

	public static async measureExecutionTime<T extends (...args: any[]) => any, U extends ReturnType<T>>(
		func: T,
		...args: Parameters<T>
	): Promise<{ result: Awaited<U>; time: number | string }> {
		const start = performance.now();
		const result = await func(...args);
		const end = performance.now();
		return { result, time: this.msToString(end - start) };
	}

	public static ToCamelCase(str: string): string {
		return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => (index === 0 ? word.toLowerCase() : word.toUpperCase())).replace(/\s+/g, "");
	}

	public static ToSnakeCase(str: string): string {
		return str.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
	}

	public static ToKebebCase(str: string): string {
		return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
	}
}

export default Lib;

export class Debug {
	public static Log(...args: any) {
		if (process.env.NODE_ENV === "production") return;
		Lib.Log(...args);
	}

	public static $Log(...args: any) {
		if (process.env.NODE_ENV === "production") return;
		Lib.$Log(...args);
	}

	public static LogObject(object: any, text?: string) {
		if (process.env.NODE_ENV === "production") return;
		Lib.LogObject(object, text);
	}

	public static GetLocalIpAddress(): string {
		try {
			const { networkInterfaces } = require("os");
			const nets = networkInterfaces();

			for (const name of Object.keys(nets)) {
				for (const net of nets[name]) {
					// Skip internal and non-IPv4 addresses
					if (!net.internal && net.family === "IPv4") {
						return net.address;
					}
				}
			}
			return "127.0.0.1"; // Fallback to localhost
		} catch (err) {
			return "127.0.0.1"; // Fallback to localhost
		}
	}
}
