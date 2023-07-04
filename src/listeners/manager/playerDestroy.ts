import type { Player } from "#lib/audio";
import { Events } from "#lib/types";
import { ApplyOptions } from "@sapphire/decorators";
import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { cyan } from "colorette";
import { oneLine } from "common-tags";

@ApplyOptions<Listener.Options>({
    emitter: container.manager,
    name: `manager:${Events.PlayerDestroy}`,
    event: Events.PlayerDestroy,
})
export class ClientListener extends Listener {
    public async run(player: Player) {
        const { client, logger } = this.container;
        const guild = client.guilds.cache.get(player.guildId) ?? (await client.guilds.fetch(player.guildId).catch(() => null));
        if (!guild) return;

        logger.info(
            oneLine`
                [${cyan(guild.shardId || 0)}] 
                - Player has been destroyed in ${guild.name}[${cyan(guild.id)}] on ${cyan(player.shoukaku.node.name)} node`
        );

        const dashboard = player.dashboard();
        const channel =
            client.channels.cache.get(player.textChannel) ?? (await client.channels.fetch(player.textChannel).catch(() => null));

        if (channel && channel.isTextBased() && isMessageInstance(dashboard)) {
            const msg = channel.messages.cache.get(dashboard.id) ?? (await channel.messages.fetch(dashboard.id).catch(() => null));
            if (!isNullish(msg) && msg.editable) {
                player.resetDashboard();
                player.history.clear();
                player.votes.clear();
                await msg.edit({ components: [] });
            }
        }
    }
}
