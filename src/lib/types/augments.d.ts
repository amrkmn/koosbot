import type { BooleanString, IntegerString, NumberString, ArrayString } from "@skyra/env-utilities";

declare module "@skyra/env-utilities" {
    interface Env {
        CLIENT_PREFIX?: string;
        CLIENT_OWNERS?: ArrayString;
        CLIENT_ID?: string;

        WASTEBIN_URL?: string;

        DISCORD_TOKEN?: string;
        DATABASE_URL_SECRET?: string;

        REDIS_HOST_SECRET?: string;
        REDIS_PORT_SECRET?: NumberString;
        REDIS_PASSWORD_SECRET?: string;
        MEILISEARCH_URL_SECRET?: string;
        MEILISEARCH_API_SECRET?: string;

        SPOTIFY_ID?: string;
        SPOTIFY_SECRET?: string;
        GENIUS_TOKEN?: string;

        PORT?: NumberString;
    }
}

declare module "@sapphire/framework" {
    interface DetailedDescriptionCommandObject {
        usage?: string[];
    }
}
