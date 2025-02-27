export type ClassConstructor<T> = new (...args: any[]) => T;
export type NonNullableType<T> = Exclude<T, null | undefined>;
type ObjectKeysValues = string | number | string[] | number[] | null;
export type ObjectKeys<T, U = ObjectKeysValues> = Partial<Record<keyof T, U>>;
export type KVObj<T> = { key: string; value: T };
