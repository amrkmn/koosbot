import type { Track } from "#lib/audio";
import { Emoji, KoosColor } from "#utils/constants";
import { container } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish, isObject } from "@sapphire/utilities";
import { EmbedBuilder, Message } from "discord.js";
import pluralize from "pluralize";
import type { NodeOption } from "shoukaku";

export async function databasePing() {
    const startTime = process.hrtime.bigint();
    await container.db.guild.findMany({ take: 1 });
    const endTime = process.hrtime.bigint() - startTime;

    return convertHrtime(endTime).milliseconds;
}

export function convertHrtime(hrtime: number | bigint) {
    const nanoseconds = Number(hrtime);
    const number = Number(nanoseconds);
    const milliseconds = number / 1e6;
    const seconds = number / 1e9;

    return { seconds, milliseconds, nanoseconds };
}

export const convertTime = (duration: number) => {
    let seconds: string = String(Math.floor((duration / 1000) % 60)).padStart(2, "0");
    let minutes: string = String(Math.floor((duration / (1000 * 60)) % 60)).padStart(2, "0");
    let hours: string = String(Math.floor((duration / (1000 * 60 * 60)) % 24)).padStart(2, "0");

    if (duration < 3600000) return minutes + ":" + seconds;
    else return hours + ":" + minutes + ":" + seconds;
};

export function parseDuration(duration: number) {
    duration = Math.floor(duration / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    const hoursString = `${hours} ${pluralize("hour", hours)}`;
    const minutesString = `${minutes} ${pluralize("minute", minutes)}`;
    const secondsString = `${seconds} ${pluralize("second", seconds)}`;

    const parts = [hoursString, minutesString, secondsString].filter((part) => part !== "");
    return parts.join(", ");
}

export const progressBar = (value: number, maxValue: number, size = 10, isStream: boolean) => {
    let emptyBar = "▬";
    let filledBar = "🔵";
    if (isStream) return emptyBar.repeat(size).replace(/.$/, `${filledBar}`);

    const percentage = value / maxValue;
    const progress = size * percentage;
    const emptyProgress = size - progress;
    const progressText = emptyBar.repeat(progress < 1 ? 1 : progress).replace(/.$/, `${filledBar}`);
    const emptyProgressText = emptyBar.repeat(emptyProgress);
    // const percentageText = (percentage * 100).toFixed(1) + "%";
    const bar = progressText + emptyProgressText;
    return bar;
};

export function removeItem<T>(array: Array<T>, value: T): Array<T> {
    const newArray = [...array];
    const index = newArray.indexOf(value);
    if (index > -1) newArray.splice(index, 1);
    return newArray;
}

export function chunk<T>(array: Array<T>, chunkSize: number) {
    if (!Array.isArray(array)) throw new TypeError("entries must be an array.");
    if (!Number.isInteger(chunkSize)) throw new TypeError("chunkSize must be an integer.");
    if (chunkSize < 1) throw new RangeError("chunkSize must be 1 or greater.");
    return Array.from(Array(Math.ceil(array.length / chunkSize)), (_, i) => array.slice(i * chunkSize, i * chunkSize + chunkSize));
}

export function trimString(str: string, length: number) {
    return str.length > length ? `${str.substring(0, length - 3)}...` : str;
}

export function cutText(str: string, length: number) {
    if (str.length < length) return str;
    const cut = splitText(str, length - 3);
    if (cut.length < length - 3) return `${cut}...`;
    return `${cut.slice(0, length - 3)}...`;
}

export function splitText(str: string, length: number, char = " ") {
    const x = str.substring(0, length).lastIndexOf(char);
    const pos = x === -1 ? length : x;
    return str.substring(0, pos);
}

export function isString(input: unknown): input is string {
    return typeof input === "string";
}

export function formatPerms(string: string) {
    let txt = string.split("_");
    let words: string[] = [];
    txt.forEach((str) => {
        words.push(str.charAt(0).toUpperCase() + str.slice(1).toLowerCase());
    });
    return words.join("");
}

export function decodeEntities(encodedString: string) {
    let translateRegex = /&(nbsp|amp|quot|lt|gt);/g;
    let translate: Record<string, string> = {
        nbsp: " ",
        amp: "&",
        quot: '"',
        lt: "<",
        gt: ">",
    };
    return encodedString
        .replace(translateRegex, (_, entity) => translate[entity])
        .replace(/&#(\d+);/gi, (_, numStr) => String.fromCharCode(parseInt(numStr, 10)));
}

export function sendLoadingMessage(message: Message) {
    return send(message, {
        embeds: [new EmbedBuilder().setDescription(`${Emoji.Loading} This might take a few seconds`).setColor(KoosColor.Default)],
    });
}

export function createTitle(track: Track, withUrl = true) {
    let author = track?.author;
    if (isNullish(author)) author = "Unknown artist";

    const title =
        track.sourceName === "youtube"
            ? `${track.title}`
            : `${track.title} ${author && author.toLowerCase() !== "unknown artist" ? `by ${author}` : ``}`;

    return withUrl ? `[${title}](${track.uri})` : title;
}

export function deepCompare<T extends Record<string, any>>(obj1: T, obj2: T): boolean {
    // If objects are the same reference, return true
    if (obj1 === obj2) {
        return true;
    }

    // If either object is null or not an object, return false
    if (!isObject(obj1) || isNullish(obj1) || !isObject(obj2) || isNullish(obj2)) {
        return false;
    }

    // Get the keys of both objects
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    // If the number of keys is different, return false
    if (keys1.length !== keys2.length) {
        return false;
    }

    // Compare the values of each key in both objects recursively
    for (const key of keys1) {
        if (!obj2.hasOwnProperty(key)) {
            return false;
        }
        if (typeof obj1[key] === "object" && typeof obj2[key] === "object") {
            if (!deepCompare(obj1[key], obj2[key])) {
                return false;
            }
        } else if (obj1[key] !== obj2[key]) {
            return false;
        }
    }

    // If all keys and values are equal, return true
    return true;
}

export function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const parseNodeOption = (node: string, index: number): NodeOption => {
    const secure = node.startsWith("wss");
    const [auth, url] = node.replace(/^wss?:\/\//, "").split("@");

    return { name: `node${index + 1}`, url, auth, secure };
};
