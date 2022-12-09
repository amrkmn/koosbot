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
