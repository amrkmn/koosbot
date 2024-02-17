import type { NodeOption } from "shoukaku";

export const zws = "\u200B";
export const UserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36";

export const Nodes: NodeOption[] = [
    { name: "node1", url: "lavalink.micium-hosting.com:80", auth: "micium-hosting.com", secure: false },
    { name: "node2", url: "localnet-sg2.ajiehost.rf.gd:50243", auth: "https://dsc.gg/ajidevserver", secure: false },
    // { name: "node1", url: "lavalink.jirayu.pw:2343", auth: "youshallnotpass", secure: false },
    // { name: "node3", url: "eu.lavalink.alexanderof.xyz:2333", auth: "lavalink", secure: false },
    // { name: "node4", url: "us.lavalink.alexanderof.xyz:2333", auth: "lavalink", secure: false },
];

export const Regex = {
    Youtube: /(youtu\.be\/|youtube\.com\/)/g,
    Spotify: /^(?:https:\/\/open\.spotify\.com\/(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track)(?:[/:])([A-Za-z0-9]+).*$/g,
} as const;

export enum KoosColor {
    Error = 0xf21100,
    Success = 0x3fb97c,
    Warn = 0xffb132,
    Default = 0xda6c56,
}

export enum PermissionLevel {
    Everyone = 0,
    DJ = 3,
    Administrator = 6,
    ServerOwner = 7,
    BotOwner = 10,
}

export enum Emoji {
    Yes = "<:yes:896571151315255366>",
    No = "<:no:926367736794341428>",
    Blank = "<:blank:1020712225616445561> ",
    Loading = "<a:loading:1027594528460386495>",
    Play = "<:play:1113811613082980492>",
    Pause = "<:pause:1113811608645406740>",
    Previous = "<:previous:1113811599858339860>",
    Skip = "<:skip:1113811604203638856>",
    Stop = "<:stop:1113811615628931072>",
}

export enum ButtonId {
    // Dashboard
    PauseOrResume = "bPauseOrResume",
    Previous = "bPrevious",
    Skip = "bSkip",
    Stop = "bStop",

    // Paginations
    First = "bFirst",
    Back = "bBack",
    Jump = "bJump",
    Next = "bNext",
    Last = "bLast",
    Close = "bClose",

    // Others
    Cancel = "bCancel",
    Votes = "bVotes",
    VotesInfo = "bVotesInfo",
    Refresh = "bRefresh",
}

export enum SelectMenuId {
    Lyrics = "sMLyrics",
    Search = "sMSearch",
    Playlist = "sMPlaylist",
}

export enum TextInputId {
    PageInput = "tIPageInput",
}
