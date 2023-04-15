import { isNullish } from "@sapphire/utilities";
import { Snowflake } from "discord.js";
import { KazagumoTrack } from "kazagumo";

const queue = new Map<Snowflake, KazagumoTrack[]>();
const currentIndex = new Map<Snowflake, number>();
const previousIndex = new Map<Snowflake, number>();

export const getQueue = (guildId: Snowflake) => queue.get(guildId);
export const getCurrentIndex = (guildId: Snowflake) => currentIndex.get(guildId);
export const getPreviousIndex = (guildId: Snowflake) => previousIndex.get(guildId);

export const deleteQueue = (guildId: Snowflake) => queue.delete(guildId);
export const deleteCurrentIndex = (guildId: Snowflake) => currentIndex.delete(guildId);
export const deletePreviousIndex = (guildId: Snowflake) => previousIndex.delete(guildId);

export function saveQueue(guildId: Snowflake, tracks: KazagumoTrack[]) {
    const savedQueue = queue.get(guildId);

    let array: KazagumoTrack[] = [];

    if (isNullish(savedQueue)) queue.set(guildId, array.concat(tracks));
    else queue.set(guildId, array.concat(savedQueue, tracks));
}

export function saveCurrentIndex(guildId: Snowflake, value: number) {
    currentIndex.set(guildId, value);
}

export function savePreviousIndex(guildId: Snowflake, value: number) {
    previousIndex.set(guildId, value);
}
