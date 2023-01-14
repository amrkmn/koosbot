import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { cyan } from "colorette";
import { Message, MessageButton } from "discord.js";
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
            `[${cyan(guild.shardId || 0)}] - Player has been destroyed in ${guild.name}[${cyan(guild.id)}] on ${cyan(
                player.shoukaku.node.name
            )} node`
        );

        const npMessage = player.data.get("nowPlayingMessage");
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));

        if (channel && channel.isText() && npMessage instanceof Message) {
            const msg = channel.messages.cache.get(npMessage.id) ?? (await channel.messages.fetch(npMessage.id).catch(() => null));

            if (!isNullish(msg) && msg.editable) {
                const row = npMessage.components;
                const disabled = row[0].components.map((button) => (button as MessageButton).setStyle("SECONDARY").setDisabled(true));

                msg.edit({ components: [{ type: "ACTION_ROW", components: disabled }] });
            }
            return;
        }
        return;
    }
}
