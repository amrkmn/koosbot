export const zws = "\u200B";
export const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36";

export const regex = {
    youtube: /(youtu\.be\/|youtube\.com\/)/g,
    spotify: /^(?:https:\/\/open\.spotify\.com\/(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track)(?:[/:])([A-Za-z0-9]+).*$/g,
};

export const EmbedColor = {
    Error: 0xf21100,
    Success: 0x3fb97c,
    Warn: 0xffb132,
    Default: 0xda6c56,
};

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
    CovidActive: "<:covid_active:1014913022688505927>",
    CovidConfirmed: "<:covid_confirmed:1014912823123521677>",
    CovidDeath: "<:covid_death:1014912826181173258>",
    CovidRecoveries: "<:covid_recoveries:1014912828920041523>",
    CovidTest: "<:covid_test:1014913025272201239>",
    Loading: "<a:loading:1027594528460386495>",
};

export const Button = {
    PauseOrResume: "buttonPauseOrResume",
    Skip: "buttonSkip",
    Stop: "buttonStop",
    ShowQueue: "buttonShowQueue",
};
