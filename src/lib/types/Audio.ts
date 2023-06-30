import type { Connector, NodeOption, ShoukakuOptions } from "shoukaku";

export interface CreatePlayerOptions {
    guildId: string;
    textChannel: string;
    voiceChannel: string;
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
    searchEngine: SearchEngine;
    send: (guildId: string, payload: Payload) => void;
    nodes: NodeOption[];
    connector: Connector;
    shoukaku: ShoukakuOptions;
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
