import type { KoosClient } from "#lib/extensions/KoosClient";
import { envParseString } from "@skyra/env-utilities";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Store } from "@sapphire/framework";
import { blue, yellow } from "colorette";
import { OAuth2Scopes, ActivityType } from "discord.js";
import { type DocumentCommand } from "#lib/types/interfaces/Meili";
import { isNullishOrEmpty } from "@sapphire/utilities";

const dev = envParseString("NODE_ENV") !== "production";

@ApplyOptions<Listener.Options>({
    once: true,
})
export class ClientListener extends Listener {
    private readonly style = dev ? yellow : blue;
    private readonly commandsToFilter = ["help"];
    private readonly categoriesToFilter = ["Owner"];

    public async run(client: KoosClient) {
        await this.syncMeili();
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

    private async syncMeili() {
        const commands = this.container.stores.get("commands");
        const documents: DocumentCommand[] = commands
            .toJSON()
            .filter((cmd) => !this.commandsToFilter.includes(cmd.name))
            .filter((cmd) => cmd.category && !this.categoriesToFilter.includes(cmd.category))
            .map((command, index) => {
                return {
                    id: `${index}`,
                    name: command.name,
                    description: command.description,
                    aliases: isNullishOrEmpty(command.aliases) ? undefined : command.aliases,
                };
            });

        this.container.meili.resetIndex("commands", documents);
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
