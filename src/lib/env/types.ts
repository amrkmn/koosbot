export type BooleanString = "true" | "false";
export type IntegerString = `${number}`;

export type KoosEnvAny = keyof KoosEnv;
export type KoosEnvString = {
    [K in KoosEnvAny]: KoosEnv[K] extends BooleanString | IntegerString ? never : K;
}[KoosEnvAny];
export type KoosEnvBoolean = {
    [K in KoosEnvAny]: KoosEnv[K] extends BooleanString ? K : string;
}[KoosEnvAny];
export type KoosEnvInteger = {
    [K in KoosEnvAny]: KoosEnv[K] extends IntegerString ? K : string;
}[KoosEnvAny];

export interface KoosEnv {
    NODE_ENV?: "test" | "development" | "production";

    CLIENT_NAME?: string;
    CLIENT_PREFIX?: string;
    CLIENT_OWNERS?: string;
    CLIENT_ID?: string;

    HASTEBIN_POST_URL?: string;
    HASTEBIN_GET_URL?: string;

    DISCORD_TOKEN?: string;
    DATABASE_URL_SECRET?: string;
    REDIS_HOST_SECRET?: string;
    REDIS_PORT_SECRET?: IntegerString;
    REDIS_PASSWORD_SECRET?: string;
    SPOTIFY_ID?: string;
    SPOTIFY_SECRET?: string;
    GENIUS_TOKEN?: string;

    PORT?: IntegerString;
}
