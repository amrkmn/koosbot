export const zws = "\u200B";
export const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36";

export const regex = {
    youtube: /(youtu\.be\/|youtube\.com\/)/g,
    spotify: /^(?:https:\/\/open\.spotify\.com\/(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track)(?:[/:])([A-Za-z0-9]+).*$/g,
};

export enum KoosColor {
    Error = 0xf21100,
    Success = 0x3fb97c,
    Warn = 0xffb132,
    Default = 0xda6c56,
}

export const PermissionLevel = {
    Everyone: 0,
    DJ: 3,
    Administrator: 6,
    ServerOwner: 7,
    BotOwner: 10,
};

export const Emoji = {
    Yes: "<:yes:896571151315255366>",
    No: "<:no:926367736794341428>",
    Blank: "<:blank:1020712225616445561> ",
    Loading: "<a:loading:1027594528460386495>",
};

export enum ButtonId {
    PauseOrResume = "buttonPauseOrResume",
    Previous = "buttonPrevious",
    Skip = "buttonSkip",
    Stop = "buttonStop",
}
