import { Manager } from "#lib/audio";
import { NODES } from "#utils/constants";
import { PrismaClient } from "@prisma/client";
import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { LogLevel, SapphireClient, container, type Awaitable, type SapphirePrefix } from "@sapphire/framework";
import { envParseNumber, envParseString } from "@skyra/env-utilities";
import { GatewayIntentBits, Guild, Message, Partials } from "discord.js";
import { Client as GeniusClient } from "genius-lyrics";
import { resolve } from "path";
import { Connectors, Shoukaku } from "shoukaku";

export class KoosClient extends SapphireClient {
    private quitting: boolean;

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

        this.quitting = false;

        ["beforeExit", "SIGUSR1", "SIGUSR2", "SIGINT", "SIGTERM"].map((event) => process.once(event, this.exit.bind(this)));
    }

    public override fetchPrefix = async (message: Message) => {
        return this.prefix(message);
    };

    public async prefix(input: Guild | Message) {
        let guildId: string | null;
        if (input instanceof Guild) guildId = input.id;
        else if (isMessageInstance(input)) guildId = input.guildId;
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
        container.manager = new Manager({
            connector: new Connectors.DiscordJS(this),
            nodes: NODES,
            send: (id, payload) => this.guilds.cache.get(id)?.shard?.send(payload),
            shoukakuOptions: {
                moveOnDisconnect: true,
            },
        });
        container.shoukaku = container.manager.shoukaku;

        await container.db.$connect().then(() => this.logger.info("Successfully connected to database"));
        return super.login(token);
    }

    private async exit() {
        if (this.quitting) return;
        this.quitting = true;

        this.destroy();
        await container.db.$disconnect();
    }
}

declare module "@sapphire/pieces" {
    interface Container {
        db: PrismaClient;
        shoukaku: Shoukaku;
        genius: GeniusClient;
        manager: Manager;
    }
}

declare module "@sapphire/framework" {
    interface SapphireClient {
        prefix(input: Guild | Message): Awaitable<SapphirePrefix>;
    }
}
