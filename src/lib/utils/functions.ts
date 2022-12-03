export const convertTime = (duration: number) => {
    let seconds: number | string = parseInt(`${(duration / 1000) % 60}`),
        minutes: number | string = parseInt(`${(duration / (1000 * 60)) % 60}`),
        hours: number | string = parseInt(`${(duration / (1000 * 60 * 60)) % 24}`);

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    if (duration < 3600000) return minutes + ":" + seconds;
    else return hours + ":" + minutes + ":" + seconds;
};

export const progressBar = (value: number, maxValue: number, size = 10, isStream: boolean) => {
    let emptyBar = "▬",
        filledBar = "🔵";
    const percentage = value / maxValue;
    const progress = size * percentage;
    const emptyProgress = size - progress;

    if (isStream) {
        return { bar: emptyBar.repeat(size).replace(/.$/, `${filledBar}`) };
    }

    const progressText = emptyBar.repeat(progress < 1 ? 1 : progress).replace(/.$/, `${filledBar}`);
    const emptyProgressText = emptyBar.repeat(emptyProgress);
    const percentageText = (percentage * 100).toFixed(1) + "%";
    const bar = progressText + emptyProgressText;
    return { bar, percentageText };
};

export function pager<T>(array: Array<T>, n: number) {
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

export function isString(input: unknown) {
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
