import { PrismaClient } from "@prisma/client";
import { type Awaitable, container, LogLevel, SapphireClient, type SapphirePrefix } from "@sapphire/framework";
import { Guild, Message, Partials, GatewayIntentBits } from "discord.js";
import { resolve } from "path";
import { Kazagumo, Plugins } from "kazagumo";
import { Connectors, type NodeOption, Shoukaku } from "shoukaku";
import { KoosPlayer } from "#lib/extensions/KoosPlayer";
import { envParseNumber, envParseString } from "@skyra/env-utilities";
import { Client as GeniusClient } from "genius-lyrics";
import { KazagumoPlugin as Spotify } from "#lib/structures";

const NODES: NodeOption[] = [
    // { name: "lavalink.aytea.ga", url: "lavalink.aytea.ga:443", auth: "maybeiwasboring", secure: true },
    // { name: "node1", url: "node1.lewdhutao.tech:1183", auth: "lewdhutao", secure: false },
    { name: "node2", url: "narco.buses.rocks:2269", auth: "glasshost1984", secure: false },
    { name: "node3", url: "lava2.horizxon.studio:80", auth: "horizxon.studio", secure: false },
    // { name: "node3", url: "lava3.horizxon.studio:80", auth: "horizxon.studio", secure: false },
    // { name: "node4", url: "lava4.horizxon.studio:80", auth: "horizxon.studio", secure: false },
];

export class KoosClient extends SapphireClient {
    constructor() {
        super({
            id: envParseString("CLIENT_ID"),
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
            ],
            logger: { level: envParseString("NODE_ENV") === "production" ? LogLevel.Info : LogLevel.Debug },
            partials: [Partials.Channel],
            caseInsensitiveCommands: true,
            caseInsensitivePrefixes: true,
            defaultPrefix: envParseString("CLIENT_PREFIX"),
            loadMessageCommandListeners: true,
            allowedMentions: {
                parse: ["roles", "users", "everyone"],
                repliedUser: false,
            },
            loadDefaultErrorListeners: true,
            baseUserDirectory: resolve(process.cwd(), "dist"),
            api: {
                listenOptions: {
                    port: envParseNumber("PORT", 3001),
                    host: "0.0.0.0",
                },
            },
        });
    }

    public override fetchPrefix = async (message: Message) => {
        return this.prefix(message);
    };

    public async prefix(input: Guild | Message) {
        let guildId: string | null;
        if (input instanceof Guild) guildId = input.id;
        else if (input instanceof Message) guildId = input.guildId;
        else return [`${envParseString("CLIENT_PREFIX")}`] as SapphirePrefix;

        const data = await container.db.guild.findUnique({ where: { id: guildId! } });
        return [
            data && data?.prefix === "NONE"
                ? `${envParseString("CLIENT_PREFIX")}`
                : data!.prefix ?? `${envParseString("CLIENT_PREFIX")}`,
        ] as SapphirePrefix;
    }

    public override async login(token?: string | undefined): Promise<string> {
        container.genius = new GeniusClient(envParseString("GENIUS_TOKEN"));
        container.db = new PrismaClient();
        container.kazagumo = new Kazagumo(
            {
                plugins: [
                    new Spotify({
                        clientId: `${envParseString("SPOTIFY_ID")}`,
                        clientSecret: `${envParseString("SPOTIFY_SECRET")}`,
                    }),
                    new Plugins.PlayerMoved(this),
                ],
                defaultSearchEngine: "youtube_music",
                extends: { player: KoosPlayer },
                defaultYoutubeThumbnail: "maxresdefault",
                send: (id, payload) => this.guilds.cache.get(id)?.shard?.send(payload),
            },
            new Connectors.DiscordJS(this),
            NODES,
            { moveOnDisconnect: true }
        );
        container.shoukaku = container.kazagumo.shoukaku;

        await container.db.$connect().then(() => this.logger.info("Successfully connected to database"));
        return super.login(token);
    }
}

declare module "@sapphire/pieces" {
    interface Container {
        db: PrismaClient;
        kazagumo: Kazagumo;
        shoukaku: Shoukaku;
        genius: GeniusClient;
    }
}

declare module "@sapphire/framework" {
    interface SapphireClient {
        prefix(input: Guild | Message): Awaitable<SapphirePrefix>;
    }
}
