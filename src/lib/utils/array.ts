import { randomInt } from "crypto";

export function first<T>(array: T[]): T | undefined;
export function first<T>(array: T[], amount: number): T[];
export function first<T>(array: T[], amount?: number): T | T[] | undefined {
    const newArray = [...array];

    if (amount === undefined) return newArray.at(0);
    if (amount < 0) return last(newArray, amount * -1);
    amount = Math.min(newArray.length, amount);
    return Array.from({ length: amount }, (_, i) => newArray[i]);
}

export function last<T>(array: T[]): T | undefined;
export function last<T>(array: T[], amount: number): T[];
export function last<T>(array: T[], amount?: number): T | T[] | undefined {
    const newArray = [...array];

    if (amount === undefined) return newArray.at(-1);
    if (amount < 0) return first(newArray, amount * -1);
    if (!amount) return [];
    return newArray.slice(-amount);
}

export function random<T>(array: T[]): T | undefined;
export function random<T>(array: T[], amount: number): T[];
export function random<T>(array: T[], amount?: number): T | T[] | undefined {
    const newArray = [...array];

    if (amount === undefined) return newArray[randomInt(newArray.length)];
    if (!newArray.length || !amount) return [];
    return Array.from(
        { length: Math.min(amount, newArray.length) }, //
        () => newArray.splice(randomInt(newArray.length), 1)[0]!
    );
}

export function remove<T>(array: T[], position: number): T[];
export function remove<T>(array: T[], position: number, to: number): T[];
export function remove<T>(array: T[], position: number, to?: number): T[] {
    const newArray = [...array];

    if (position === to) to = undefined;
    if (to && to < position) to = undefined;

    if (position < 0) throw new Error(`The "position" value must be from 0 to ${newArray.length - 1}`);
    if (position > newArray.length - 1 || (to && to > newArray.length - 1))
        throw new Error(`The "position" or "to" value greater than ${newArray.length - 1}`);

    const count = to ? to - position + 1 : 1;
    newArray.splice(position, count);
    return newArray;
}
