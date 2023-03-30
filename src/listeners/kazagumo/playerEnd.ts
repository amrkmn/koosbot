import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Message, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { Events, KazagumoPlayer } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerEnd}`,
    event: Events.PlayerEnd,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer) {
        const { client } = this.container;
        const npMessage = player.data.get("nowPlayingMessage");
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));

        if (channel && channel.isTextBased() && npMessage instanceof Message) {
            const msg = channel.messages.cache.get(npMessage.id) ?? (await channel.messages.fetch(npMessage.id).catch(() => null));

            if (!isNullish(msg) && msg.editable) {
                const row = npMessage.components;
                const disabled = row[0].components.map((button: unknown) =>
                    (button as ButtonBuilder).setStyle(ButtonStyle.Secondary).setDisabled(true)
                );

                msg.edit({ components: [{ type: ComponentType.ActionRow, components: disabled }] });
            }
        }
    }
}
