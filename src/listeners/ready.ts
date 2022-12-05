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
        client.logger.info(`Logged in as ${client.user?.tag}`);
        this.printStoreDebugInformation();

        // client.guilds.cache.map(async (guild) => {
        //     await this.container.db.guild.upsert({ where: { id: guild.id }, update: {}, create: { id: guild.id } });
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
