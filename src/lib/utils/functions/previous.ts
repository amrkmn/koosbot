import { isNullish } from "@sapphire/utilities";
import { KazagumoPlayer, KazagumoTrack } from "kazagumo";

export const getPrevious = (player: KazagumoPlayer): KazagumoTrack[] => player.data.get("previous");
export const deletePrevious = (player: KazagumoPlayer): boolean => player.data.delete("previous");

export function setPrevious(player: KazagumoPlayer, track: KazagumoTrack): void {
    const savedPrevious = getPrevious(player);

    let array: KazagumoTrack[] = [];

    if (isNullish(savedPrevious)) player.data.set("previous", array.concat(track));
    else player.data.set("previous", array.concat(savedPrevious, track));
}

export function getPreviousTrack(player: KazagumoPlayer) {
    const savedPrevious = getPrevious(player);
    if (isNullish(savedPrevious)) return undefined;

    const lastTrack = savedPrevious.pop();
    player.data.set("previous", savedPrevious);

    return lastTrack;
}

// const previous = new Map<Snowflake, KazagumoTrack[]>();

// export const getPrevious = (guildId: Snowflake) => previous.get(guildId);
// export const deletePrevious = (guildId: Snowflake) => previous.delete(guildId);

// export function setPrevious(guildId: Snowflake, track: KazagumoTrack) {
//     const savedPrevious = getPrevious(guildId);

//     let array: KazagumoTrack[] = [];

//     if (isNullish(savedPrevious)) previous.set(guildId, array.concat(track));
//     else previous.set(guildId, array.concat(savedPrevious, track));
// }

// export function getPreviousTrack(guildId: Snowflake) {
//     const savedPrevious = getPrevious(guildId);
//     if (isNullish(savedPrevious)) return undefined;

//     const lastTrack = savedPrevious.pop();
//     previous.set(guildId, savedPrevious);

//     return lastTrack;
// }
