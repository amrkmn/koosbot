import { isNullish } from "@sapphire/utilities";
import { Snowflake } from "discord.js";
import { KazagumoTrack } from "kazagumo";

const previous = new Map<Snowflake, KazagumoTrack[]>();

export const getPrevious = (guildId: Snowflake) => previous.get(guildId);
export const deletePrevious = (guildId: Snowflake) => previous.delete(guildId);

export function setPrevious(guildId: Snowflake, track: KazagumoTrack) {
    const savedPrevious = getPrevious(guildId);

    let array: KazagumoTrack[] = [];

    if (isNullish(savedPrevious)) previous.set(guildId, array.concat(track));
    else previous.set(guildId, array.concat(savedPrevious, track));
}

export function getPreviousTrack(guildId: Snowflake) {
    const savedPrevious = getPrevious(guildId);
    if (isNullish(savedPrevious)) return undefined;

    const lastTrack = savedPrevious.pop();
    previous.set(guildId, savedPrevious);

    return lastTrack;
}
