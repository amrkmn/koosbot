import { Time } from "@sapphire/duration";

export function sec(seconds: number): number {
    if (isNaN(seconds)) throw new Error("Input must be a valid number");
    return Time.Second * seconds;
}
export function mins(minutes: number): number {
    if (isNaN(minutes)) throw new Error("Input must be a valid number");
    return Time.Minute * minutes;
}
export function hours(hours: number): number {
    if (isNaN(hours)) throw new Error("Input must be a valid number");
    return Time.Hour * hours;
}
export function months(months: number): number {
    if (isNaN(months)) throw new Error("Input must be a valid number");
    return months * Time.Month;
}
export function years(years: number): number {
    if (isNaN(years)) throw new Error("Input must be a valid number");
    return years * Time.Year;
}

export function time(unit: "sec" | "mins" | "hours" | "months" | "years", time: number) {
    return { sec, mins, hours, months, years }[unit](time);
}

export function timeToMs(timeStr: string) {
    const timeArray = timeStr.split(":").map(Number);
    let ms = 0;

    if (timeArray.length === 3) {
        // hh:mm:ss
        ms += timeArray[0] * 60 * 60 * 1000; // hours to ms
        timeArray.shift(); // remove hours from array
    }

    ms += timeArray[0] * 60 * 1000; // minutes to ms
    ms += timeArray[1] * 1000; // seconds to ms

    return ms;
}
