import { Player } from "#lib/audio";
import { Events, SearchEngine, type CreatePlayerOptions, type ManagerOptions, type Result, type SearchOptions } from "#lib/types";
import { Regex } from "#utils/constants";
import { transform } from "#utils/functions";
import { isNullish, isNumber } from "@sapphire/utilities";
import { EventEmitter } from "node:events";
import { Shoukaku } from "shoukaku";

export class Manager extends EventEmitter {
    public shoukaku: Shoukaku;
    public readonly players = new Map<string, Player>();

    constructor(public options: ManagerOptions) {
        super();

        this.shoukaku = new Shoukaku(options.connector, options.nodes, options.shoukakuOptions);
    }

    public async createPlayer(options: CreatePlayerOptions) {
        const cached = this.players.get(options.guildId);
        if (cached) return cached;

        let node = this.shoukaku.options.nodeResolver(this.shoukaku.nodes);
        if (isNullish(node)) throw new Error("No node found");

        const shoukakuPlayer = await this.shoukaku.joinVoiceChannel({
            guildId: options.guildId,
            channelId: options.voiceChannel,
            shardId: isNumber(options.shardId) ? options.shardId : 0,
            deaf: options.selfDeafen,
            mute: options.selfMute,
        });

        const player = new Player(this, shoukakuPlayer, {
            guildId: options.guildId,
            textChannel: options.textChannel,
            voiceChannel: options.voiceChannel,
            volume: isNumber(options.volume) ? options.volume : 100,
            selfDeafen: isNullish(options.selfDeafen) ? true : options.selfDeafen,
        });

        this.players.set(options.guildId, player);
        this.emit(Events.PlayerCreate, player);
        return player;
    }

    public async search(query: string, options: SearchOptions) {
        const node = this.shoukaku.options.nodeResolver(this.shoukaku.nodes);
        if (isNullish(node)) throw new Error("No available node");

        let result: Result;

        // if (Regex.Spotify.test(query)) {
        //     Regex.Spotify.lastIndex = 0;

        //     const spotify = new Spotify({
        //         clientId: `${envParseString("SPOTIFY_ID")}`,
        //         clientSecret: `${envParseString("SPOTIFY_SECRET")}`,
        //     });

        //     const exec = Regex.Spotify.exec(query);
        //     const [, type, id] = isNullishOrEmpty(exec) ? [] : exec;

        //     if (type === "track") result = await spotify.getTrack(id, options.requester);
        //     else if (type === "album") result = await spotify.getAlbum(id, options.requester);
        //     else if (type === "playlist") result = await spotify.getPlaylist(id, options.requester);
        //     else result = await spotify.searchTrack(query, options.requester);
        // } else
        if (Regex.Youtube.test(query)) {
            const res = await node.rest.resolve(query);
            result = transform(res, options.requester);
        } else {
            const isHttp = /^https?:\/\//.test(query);
            const res = await node.rest.resolve(
                isHttp ? query : `${isNullish(options.engine) ? SearchEngine.YoutubeMusic : options.engine}:${query}`
            );
            result = transform(res, options.requester);
        }

        return result;
    }
}
