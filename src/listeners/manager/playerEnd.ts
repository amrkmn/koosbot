import type { Player } from "#lib/audio";
import { Events } from "#lib/types";
import { ApplyOptions } from "@sapphire/decorators";
import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";

@ApplyOptions<Listener.Options>({
    emitter: container.manager,
    name: `manager:${Events.PlayerEnd}`,
    event: Events.PlayerEnd,
})
export class ClientListener extends Listener {
    public async run(player: Player) {
        const { client } = this.container;
        const dashboard = player.dashboard();
        const channel =
            client.channels.cache.get(player.textChannel) ?? (await client.channels.fetch(player.textChannel).catch(() => null));

        if (channel && channel.isTextBased() && isMessageInstance(dashboard)) {
            const msg = channel.messages.cache.get(dashboard.id) ?? (await channel.messages.fetch(dashboard.id).catch(() => null));

            if (!isNullish(msg) && msg.editable) {
                player.resetDashboard();
                player.votes.clear();
                await msg.edit({ components: [] });
            }
        }
    }
}
