import type { Player } from "#lib/audio";
import { Events } from "#lib/types";
import { KoosColor } from "#utils/constants";
import { createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { EmbedBuilder } from "discord.js";
import { type TrackExceptionEvent } from "shoukaku";

@ApplyOptions<Listener.Options>({
    emitter: container.manager,
    name: `manager:${Events.PlayerException}`,
    event: Events.PlayerException,
})
export class ClientListener extends Listener {
    public async run(player: Player, _data: TrackExceptionEvent) {
        const { client } = this.container;
        const channel =
            client.channels.cache.get(player.textChannel) ?? (await client.channels.fetch(player.textChannel).catch(() => null));
        const dashboard = player.dashboard();
        if (isNullish(player.current)) return;

        if (channel && channel.isTextBased()) {
            const title = createTitle(player.current);
            channel.send({
                embeds: [
                    new EmbedBuilder().setDescription(`${title} throw an exeption when trying to play it`).setColor(KoosColor.Error),
                ],
            });

            if (isNullish(dashboard)) return;
            const msg = channel.messages.cache.get(dashboard.id) ?? (await channel.messages.fetch(dashboard.id).catch(() => null));
            if (!isNullish(msg) && msg.editable) {
                player.resetDashboard();
                player.votes.clear();
                await msg.edit({ components: [] });
            }
        }
    }
}
