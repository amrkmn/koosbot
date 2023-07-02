import { Player, Track } from "#lib/audio";
import { Spotify } from "#lib/structures";
import {
    Events,
    SearchEngine,
    State,
    type CreatePlayerOptions,
    type ManagerOptions,
    type SearchOptions,
    type Result,
} from "#lib/types";
import { Regex } from "#utils/constants";
import { isNullish, isNullishOrEmpty, isNumber, type Nullish } from "@sapphire/utilities";
import { envParseString } from "@skyra/env-utilities";
import { EventEmitter } from "events";
import { Node, Shoukaku } from "shoukaku";

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

        let node: Node | Nullish;
        if (options.loadBalancer) node = this.getLeastUsedNode();
        else if (options.nodeName) node = this.shoukaku.getNode(options.nodeName);
        else node = this.shoukaku.getNode("auto");

        if (isNullish(node)) throw new Error("No node found");

        const shoukakuPlayer = await node.joinChannel({
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

    public getLeastUsedNode(): Node {
        const nodes: Node[] = [...this.shoukaku.nodes.values()];

        const onlineNodes = nodes.filter((node) => node.state === State.CONNECTED);
        if (!onlineNodes.length) throw new Error("No nodes are online");

        return onlineNodes.reduce((a, b) => (a.players.size < b.players.size ? a : b));
    }

    public async search(query: string, options: SearchOptions) {
        const node = options?.nodeName ? this.shoukaku.getNode(options.nodeName) : this.getLeastUsedNode();
        if (isNullish(node)) throw new Error("No available node");

        let result: Result;
        if (Regex.Spotify.test(query)) {
            Regex.Spotify.lastIndex = 0;

            const spotify = new Spotify({
                clientId: `${envParseString("SPOTIFY_ID")}`,
                clientSecret: `${envParseString("SPOTIFY_SECRET")}`,
            });

            const exec = Regex.Spotify.exec(query);
            const [, type, id] = isNullishOrEmpty(exec) ? [] : exec;

            if (type === "track") result = await spotify.getTrack(id, options.requester);
            else if (type === "album") result = await spotify.getAlbum(id, options.requester);
            else if (type === "playlist") result = await spotify.getPlaylist(id, options.requester);
            else result = await spotify.searchTrack(query, options.requester);
        } else if (Regex.Youtube.test(query)) {
            const res = await node.rest.resolve(query);
            if (isNullish(res)) result = { loadType: "LOAD_FAILED", playlistInfo: {}, tracks: [] };
            else {
                const tracks = res.tracks.map((track) => new Track(track, options.requester)) ?? [];
                result = { ...res, tracks };
            }
        } else {
            const isHttp = /^https?:\/\//.test(query);
            const res = await node.rest.resolve(
                isHttp ? query : `${isNullish(options.engine) ? SearchEngine.YoutubeMusic : options.engine}:${query}`
            );

            if (isNullish(res)) result = { loadType: "LOAD_FAILED", playlistInfo: {}, tracks: [] };
            else {
                const tracks = res.tracks.map((track) => new Track(track, options.requester)) ?? [];
                result = { ...res, tracks };
            }
        }

        return result;
    }
}
