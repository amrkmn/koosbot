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
