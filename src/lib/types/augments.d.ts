import type { BooleanString, IntegerString, NumberString, ArrayString } from "@skyra/env-utilities";

declare module "@skyra/env-utilities" {
    interface Env {
        CLIENT_PREFIX?: string;
        CLIENT_OWNERS?: ArrayString;
        CLIENT_ID?: string;

        WASTEBIN_URL?: string;

        DISCORD_TOKEN?: string;
        DATABASE_URL_SECRET?: string;

        LAVALINK_NODES?: ArrayString;

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
