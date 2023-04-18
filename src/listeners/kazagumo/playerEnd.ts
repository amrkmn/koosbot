import { KoosColor } from "#utils/constants";
import { createTitle, deleteNp, getNp, setPrevious } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { oneLine } from "common-tags";
import { Message, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { Events, KazagumoPlayer, KazagumoTrack } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerEnd}`,
    event: Events.PlayerEnd,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer, track?: KazagumoTrack) {
        const { client } = this.container;
        const npMessage = getNp(player);
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));

        if (!isNullish(track)) setPrevious(player, track);

        if (channel && channel.isTextBased() && npMessage instanceof Message) {
            const msg = channel.messages.cache.get(npMessage.id) ?? (await channel.messages.fetch(npMessage.id).catch(() => null));

            if (!isNullish(msg) && msg.editable) {
                // const row = npMessage.components;
                // const disabled = row[0].components.map((component) =>
                //     new ButtonBuilder(component.data).setStyle(ButtonStyle.Secondary).setDisabled(true)
                // );

                msg.edit({ components: [] });
                deleteNp(player);
            }
        }
    }
}
