import { envParseString } from "#env";
import type { KoosClient } from "#lib/extensions/KoosClient";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Store } from "@sapphire/framework";
import { blue, yellow } from "colorette";

const dev = envParseString("NODE_ENV") !== "production";

@ApplyOptions<Listener.Options>({
    once: true,
})
export class ClientListener extends Listener {
    private readonly style = dev ? yellow : blue;
    public async run(client: KoosClient) {
        client.logger.info(
            client.generateInvite({
                scopes: ["bot"],
                permissions: [
                    "CREATE_INSTANT_INVITE",
                    "ATTACH_FILES",
                    "CONNECT",
                    "EMBED_LINKS",
                    "MANAGE_MESSAGES",
                    "SEND_MESSAGES",
                    "READ_MESSAGE_HISTORY",
                    "ADD_REACTIONS",
                    "USE_EXTERNAL_EMOJIS",
                    "SPEAK",
                    "VIEW_AUDIT_LOG",
                ],
            })
        );
        client.logger.info(`Logged in as ${client.user?.tag}`);
        this.printStoreDebugInformation();

        client.guilds.cache.map(async (guild) => {
            await this.container.db.guilds
                .upsert({ where: { id: guild.id }, update: {}, create: { id: guild.id, prefix: envParseString("CLIENT_PREFIX") } })
                .catch(() => undefined);
        });
    }

    private printStoreDebugInformation() {
        const { client, logger } = this.container;
        const stores = [...client.stores.values()];
        const last = stores.pop()!;

        for (const store of stores) logger.info(this.styleStore(store, false));
        logger.info(this.styleStore(last, true));
    }

    private styleStore(store: Store<any>, last: boolean) {
        return `${last ? "└─" : "├─"} Loaded ${this.style(store.size.toString().padEnd(3, " "))} ${store.name}.`;
    }
}
