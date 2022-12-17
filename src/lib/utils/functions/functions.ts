import { container } from "@sapphire/framework";

export async function databasePing() {
    const startTime = process.hrtime.bigint();
    await container.db.guilds.findMany();
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

export function chunk<T>(array: Array<T>, n: number) {
    return Array.from(Array(Math.ceil(array.length / n)), (_, i) => array.slice(i * n, i * n + n));
}

export function trimString(string: string, length: number) {
    return string.length > length ? string.substring(0, length - 3) + "..." : string;
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
