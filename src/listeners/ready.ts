import type { KoosClient } from "#lib/extensions/KoosClient";
import { envParseString } from "@skyra/env-utilities";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Store } from "@sapphire/framework";
import { blue, yellow } from "colorette";
import { OAuth2Scopes, ActivityType } from "discord.js";

const dev = envParseString("NODE_ENV") !== "production";

@ApplyOptions<Listener.Options>({
    once: true,
})
export class ClientListener extends Listener {
    private readonly style = dev ? yellow : blue;

    public async run(client: KoosClient) {
        client.logger.info(
            client.generateInvite({
                scopes: [OAuth2Scopes.Bot],
                permissions: [
                    "CreateInstantInvite",
                    "AttachFiles",
                    "Connect",
                    "EmbedLinks",
                    "ManageMessages",
                    "SendMessages",
                    "ReadMessageHistory",
                    "AddReactions",
                    "UseExternalEmojis",
                    "Speak",
                    "ViewAuditLog",
                ],
            })
        );
        client.user?.setActivity({ type: ActivityType.Listening, name: `/play` });
        client.logger.info(`Logged in as ${client.user?.tag}`);
        this.printStoreDebugInformation();

        // client.guilds.cache.map(async (guild) => {
        //     await this.container.db.guild
        //         .upsert({
        //             where: { id: guild.id },
        //             update: { prefix: envParseString("CLIENT_PREFIX") },
        //             create: { id: guild.id, prefix: envParseString("CLIENT_PREFIX") },
        //         })
        //         .catch(() => undefined);
        // });
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
