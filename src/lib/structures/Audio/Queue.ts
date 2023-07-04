import type { Track } from "#lib/audio";
import { remove, swap } from "#utils/array";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { inspect } from "util";

export type QueueStrategy = "LIFO" | "FIFO";

export type QueueItemFilter<T, R = boolean> = (value: T, idx: number, array: T[]) => R;

export class Queue {
    public store: Track[];
    public constructor(public strategy: QueueStrategy = "FIFO", initializer: Track[] = []) {
        if (!["FIFO", "LIFO"].includes(strategy)) throw new TypeError(`Invalid queue strategy "${strategy}"!`);
        this.store = Array.isArray(initializer) ? initializer : [];

        Object.defineProperty(this, "store", {
            writable: true,
            configurable: true,
            enumerable: false,
        });
    }

    public get empty() {
        return isNullishOrEmpty(this.data);
    }

    public get data() {
        return this.toArray();
    }

    public get duration() {
        return this.store.reduce((acc, cur) => acc + cur.length, 0);
    }

    public get size() {
        return this.store.length;
    }

    public static from(data: Track[], strategy: QueueStrategy = "FIFO") {
        return new Queue(strategy, data);
    }

    public isFIFO() {
        return this.strategy === "FIFO";
    }

    public isLIFO() {
        return this.strategy === "LIFO";
    }

    public add(item: Track | Track[]) {
        if (this.strategy === "FIFO") {
            if (Array.isArray(item)) this.store.push(...item);
            else this.store.push(item);
        } else {
            if (Array.isArray(item)) this.store.unshift(...item);
            else this.store.unshift(item);
        }
    }

    public shift() {
        return this.store.shift();
    }

    public unshift(...items: Track[]) {
        return this.store.unshift(...items);
    }

    public reverse() {
        return this.store.reverse();
    }

    public splice(start: number, deleteCount?: number, ...items: Track[]) {
        if (isNullishOrEmpty(items) && deleteCount) return this.store.splice(start, deleteCount, ...items);
        else return this.store.splice(start, deleteCount);
    }

    public clear() {
        this.store = [];
    }

    public shuffle() {
        for (let i = this.store.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.store[i], this.store[j]] = [this.store[j], this.store[i]];
        }
    }

    public swap(source: number, destination: number) {
        return swap(this.store, source, destination);
    }

    public remove(position: number, to?: number) {
        return remove(this.store, position, to);
    }

    public find(itemFilter: QueueItemFilter<Track>) {
        return this.store.find(itemFilter);
    }

    public filter(itemFilter: QueueItemFilter<Track>) {
        return this.store.filter(itemFilter);
    }

    public some(itemFilter: QueueItemFilter<Track>) {
        return this.store.some(itemFilter);
    }

    public every(itemFilter: QueueItemFilter<Track>) {
        return this.store.every(itemFilter);
    }

    public map<R = Track>(itemFilter: QueueItemFilter<Track, R>) {
        const arr = this.toArray();
        return arr.map(itemFilter);
    }

    public at(idx: number) {
        const arr = this.toArray();
        return typeof Array.prototype.at === "function" ? arr.at(idx) : arr[idx];
    }

    public dispatch() {
        return this.store.shift();
    }

    public clone() {
        return new Queue(this.strategy, this.store.slice());
    }

    public toString() {
        return `Queue<${this.store.length} items>`;
    }

    public toArray() {
        return this.store.slice();
    }

    public toJSON() {
        return this.store;
    }

    public [inspect.custom]() {
        return `${this.constructor.name} {\n  strategy: '${this.strategy}',\n  data: ${inspect(this.data, {
            showHidden: false,
            colors: true,
            depth: 1,
            maxArrayLength: 5,
        })}\n}`;
    }
}
