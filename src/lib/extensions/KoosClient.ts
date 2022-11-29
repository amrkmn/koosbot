import { PrismaClient } from "@prisma/client";
import { container, LogLevel, SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord-api-types/v9";
import { Guild, Message } from "discord.js";
import { resolve } from "path";
import { Kazagumo, Plugins } from "kazagumo";
import { Connectors, NodeOption, Shoukaku } from "shoukaku";
import { KoosPlayer } from "#lib/extensions/KoosPlayer";
import Spotify from "kazagumo-spotify";

const { CLIENT_PREFIX, NODE_ENV } = process.env;

const NODES: NodeOption[] = [
    { name: "localhost", url: "127.0.0.1:2333", auth: "youshallnotpass", secure: false },
    { name: "lavalink-replit.aytea14.repl.co", url: "lavalink-replit.aytea14.repl.co:443", auth: "maybeiwasboring", secure: true },
    { name: "lava1.horizxon.studio", url: "lava1.horizxon.studio:80", auth: "horizxon.studio", secure: false },
    { name: "lava2.horizxon.studio", url: "lava2.horizxon.studio:80", auth: "horizxon.studio", secure: false },
    { name: "lava3.horizxon.studio", url: "lava3.horizxon.studio:80", auth: "horizxon.studio", secure: false },
    { name: "lava4.horizxon.studio", url: "lava4.horizxon.studio:80", auth: "horizxon.studio", secure: false },
];

export class KoosClient extends SapphireClient {
    constructor() {
        super({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
            logger: { level: NODE_ENV === "production" ? LogLevel.Info : LogLevel.Debug },
            partials: ["CHANNEL"],
            caseInsensitiveCommands: true,
            caseInsensitivePrefixes: true,
            defaultPrefix: CLIENT_PREFIX,
            loadMessageCommandListeners: true,
            allowedMentions: {
                parse: ["roles", "users", "everyone"],
                repliedUser: false,
            },
            loadDefaultErrorListeners: true,
            baseUserDirectory: resolve(process.cwd(), "dist"),
        });
    }

    public override fetchPrefix = async (message: Message) => {
        return this.prefix(message);
    };

    public async prefix(input: Guild | Message) {
        let guildId: string | null;
        if (input instanceof Guild) guildId = input.id;
        else if (input instanceof Message) guildId = input.guildId;
        else return `${CLIENT_PREFIX}`;

        const data = await container.db.guild.findUnique({ where: { id: guildId! } });
        return data?.prefix ?? `${CLIENT_PREFIX}`;
    }

    public override async login(token?: string | undefined): Promise<string> {
        container.db = new PrismaClient();
        container.kazagumo = new Kazagumo(
            {
                plugins: [
                    new Spotify({
                        clientId: process.env.SPOTIFY_ID + "",
                        clientSecret: process.env.SPOTIFY_SECRET + "",
                    }),
                    new Plugins.PlayerMoved(this),
                ],
                defaultSearchEngine: "youtube",
                extends: { player: KoosPlayer },
                send: (id, payload) => this.guilds.cache.get(id)?.shard?.send(payload),
            },
            new Connectors.DiscordJS(this),
            NODES
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
    }
}
