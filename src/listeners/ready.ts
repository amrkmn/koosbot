import type { KoosClient } from "#lib/extensions/KoosClient";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Store } from "@sapphire/framework";
import { blue, yellow } from "colorette";

const dev = process.env.NODE_ENV !== "production";

@ApplyOptions<Listener.Options>({
    once: true,
})
export class ClientListener extends Listener {
    private readonly style = dev ? yellow : blue;
    public async run(client: KoosClient) {
        client.logger.info(`Logged in as ${client.user?.tag}`);
        this.printStoreDebugInformation();
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
