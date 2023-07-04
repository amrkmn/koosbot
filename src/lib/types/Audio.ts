import type { Player, Track } from "#lib/audio";
import type { Nullish } from "@sapphire/utilities";
import type { GuildMember } from "discord.js";
import type { Connector, LoadType, NodeOption, ShoukakuOptions } from "shoukaku";

export interface PlayOptions {
    noReplace?: boolean;
    pause?: boolean;
    startTime?: number;
    endTime?: number;

    replaceCurrent?: boolean;
}

export interface ResolveOptions {
    overwrite?: boolean;
    forceResolve?: boolean;
    player?: Player;
}

export interface CreatePlayerOptions {
    guildId: string;
    textChannel: string;
    voiceChannel: string;
    nodeName?: string;
    loadBalancer?: string;
    volume?: number;
    selfMute?: boolean;
    selfDeafen?: boolean;
    shardId?: number;
}
export interface PlayerOptions {
    guildId: string;
    voiceChannel: string;
    textChannel: string;
    selfDeafen: boolean;
    volume: number;
    searchWithSameNode?: boolean;
}

export interface ManagerOptions {
    defaultSearchEngine?: SearchEngine;
    sourceForceResolve?: string[];
    send: (guildId: string, payload: Payload) => void;
    nodes: NodeOption[];
    connector: Connector;
    shoukakuOptions: ShoukakuOptions;
}

export interface SearchOptions {
    requester?: GuildMember | Nullish;
    engine?: SearchEngine;
    nodeName?: string;
}

export interface Result {
    loadType: LoadType;
    tracks: Track[];
    playlistInfo: {
        name?: string;
        selectedTrack?: number;
    };
}

export interface RawTrack {
    track: string;
    info: {
        identifier: string;
        isSeekable: boolean;
        author: string;
        length: number;
        isStream: boolean;
        position: number;
        title: string;
        uri: string;
        sourceName: string;
        thumbnail?: string | Nullish;
    };
}

export interface Payload {
    op: number;
    d: {
        guild_id: string;
        channel_id: string | null;
        self_mute: boolean;
        self_deaf: boolean;
    };
}

export interface PlayerProgressbarOptions {
    timecodes?: boolean;
    length?: number;
    line?: string;
    indicator?: string;
    queue?: boolean;
}

export const SupportedSources = [
    "bandcamp",
    "beam",
    "getyarn",
    "http",
    "local",
    "nico",
    "soundcloud",
    "stream",
    "twitch",
    "vimeo",
    "youtube",
];

export enum State {
    CONNECTING,
    CONNECTED,
    DISCONNECTING,
    DISCONNECTED,
}

export enum PlayerState {
    CONNECTING,
    CONNECTED,
    DISCONNECTING,
    DISCONNECTED,
    DESTROYING,
    DESTROYED,
}

export enum SearchEngine {
    Youtube = "ytsearch",
    YoutubeMusic = "ytmsearch",
    Soundcloud = "scsearch",
}

export enum Events {
    PlayerDestroy = "playerDestroy",
    PlayerCreate = "playerCreate",
    PlayerStart = "playerStart",
    PlayerEnd = "playerEnd",
    PlayerEmpty = "playerEmpty",
    PlayerClosed = "playerClosed",
    PlayerUpdate = "playerUpdate",
    PlayerException = "playerException",
    PlayerError = "playerError",
    PlayerResumed = "playerResumed",
    PlayerStuck = "playerStuck",
    PlayerResolveError = "playerResolveError",
    PlayerMoved = "playerMoved",

    Debug = "debug",
}
