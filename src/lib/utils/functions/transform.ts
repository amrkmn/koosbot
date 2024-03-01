import { Track } from "#lib/audio";
import type { Result } from "#lib/types";
import { isNullish, type Nullish } from "@sapphire/utilities";
import type { GuildMember } from "discord.js";
import { LoadType, type LavalinkResponse } from "shoukaku";

export function transform(input: LavalinkResponse | Nullish, requester?: GuildMember | Nullish): Result {
    if (isNullish(input))
        return {
            loadType: LoadType.ERROR,
            tracks: [],
        };

    if (input.loadType === LoadType.SEARCH) {
        const tracks = input.data.map((track) => new Track(track, requester));
        return {
            loadType: LoadType.SEARCH,
            tracks: tracks,
        };
    } else if (input.loadType === LoadType.TRACK) {
        const track = new Track(input.data, requester);
        return {
            loadType: LoadType.TRACK,
            tracks: [track],
        };
    } else if (input.loadType === LoadType.PLAYLIST) {
        const tracks = input.data.tracks.map((track) => new Track(track, requester));
        const name = input.data.info.name;
        return {
            loadType: LoadType.PLAYLIST,
            tracks: tracks,
            playlistName: name,
        };
    } else {
        return {
            loadType: input.loadType,
            tracks: [],
        };
    }
}
