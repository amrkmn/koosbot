export const zws = "\u200B";

export const regex = {
    youtube: /(youtu\.be\/|youtube\.com\/)/g,
    spotify: /^(?:https:\/\/open\.spotify\.com\/(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track)(?:[/:])([A-Za-z0-9]+).*$/g,
};

export const embedColor = {
    error: 0xf21100,
    success: 0x3fb97c,
    warn: 0xffb132,
    default: 0xda6c56,
};

export const permissionLevels = {
    everyone: 0,
    dj: 3,
    administrator: 6,
    serverOwner: 7,
    botOwner: 10,
};

export const emojis = {
    yes: "<:yes:896571151315255366>",
    no: "<:no:926367736794341428>",
    blank: "<:blank:1020712225616445561> ",
    covidActive: "<:covid_active:1014913022688505927>",
    covidConfirmed: "<:covid_confirmed:1014912823123521677>",
    covidDeath: "<:covid_death:1014912826181173258>",
    covidRecoveries: "<:covid_recoveries:1014912828920041523>",
    covidTest: "<:covid_test:1014913025272201239>",
    loading: "<a:loading:1027594528460386495>",
};

export const buttons = {
    pauseOrResume: "buttonPauseOrResume",
    skip: "buttonSkip",
    stop: "buttonStop",
    showQueue: "buttonShowQueue",
};
