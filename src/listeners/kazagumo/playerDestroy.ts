import { ApplyOptions } from "@sapphire/decorators";
import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { cyan } from "colorette";
import { oneLine } from "common-tags";
import { Events, KazagumoPlayer } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerDestroy}`,
    event: Events.PlayerDestroy,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer) {
        const { client, logger } = this.container;
        const guild = client.guilds.cache.get(player.guildId) ?? (await client.guilds.fetch(player.guildId).catch(() => null));
        if (!guild) return;

        logger.info(
            oneLine`
                [${cyan(guild.shardId || 0)}] 
                - Player has been destroyed in ${guild.name}[${cyan(guild.id)}] on ${cyan(player.shoukaku.node.name)} node`
        );

        const dashboard = player.dashboard();
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));

        if (channel && channel.isTextBased() && isMessageInstance(dashboard)) {
            const msg = channel.messages.cache.get(dashboard.id) ?? (await channel.messages.fetch(dashboard.id).catch(() => null));
            if (!isNullish(msg) && msg.editable) {
                // const row = npMessage.components;
                // const disabled = row[0].components.map((component) =>
                //     new ButtonBuilder(component.data).setStyle(ButtonStyle.Secondary).setDisabled(true)
                // );

                player.resetDashboard();
                player.history.clear();
                player.votes.clear();
                await msg.delete();
            }
        }
    }
}
