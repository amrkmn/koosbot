import { randomInt } from "crypto";

export function first<T>(array: T[], amount?: number): T | T[] | undefined {
    if (amount === undefined) return array.at(0);
    if (amount < 0) return last(array, amount * -1);
    amount = Math.min(array.length, amount);
    return Array.from({ length: amount }, (_, i) => array[i]);
}

export function last<T>(array: T[], amount?: number): T | T[] | undefined {
    if (amount === undefined) return array.at(-1);
    if (amount < 0) return first(array, amount * -1);
    if (!amount) return [];
    return array.slice(-amount);
}

export function random<T>(array: T[], amount?: number): T | T[] | undefined {
    if (amount === undefined) return array[randomInt(array.length)];
    if (!array.length || !amount) return [];
    return Array.from(
        { length: Math.min(amount, array.length) }, //
        () => array.splice(randomInt(array.length), 1)[0]!
    );
}

export function remove<T>(array: T[], position: number, to?: number): T[] {
    if (position === to) to = undefined;
    if (to && to < position) to = undefined;

    if (position < 0) throw new Error(`The "position" value must be from 0 to ${array.length - 1}`);
    if (position > array.length - 1 || (to && to > array.length - 1))
        throw new Error(`The "position" or "to" value greater than ${array.length - 1}`);

    const count = to ? to - position + 1 : 1;
    array.splice(position, count);
    return array;
}

export function swap<T>(array: T[], source: number, destination: number) {
    if (source > array.length || destination > array.length)
        throw new Error(`The array doesn't have that many elements (Total length: ${array.length})`);
    if (source < 1 || destination < 1)
        throw new Error(`The ${source < 1 ? "source" : "destination"} number must be from 1 to ${array.length}`);

    const sourceElement = array[source - 1];
    const destinationElement = array[destination - 1];

    array[source - 1] = destinationElement;
    array[destination - 1] = sourceElement;

    return array;
}
