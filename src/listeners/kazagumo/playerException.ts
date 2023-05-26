import { KoosColor } from "#utils/constants";
import { createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { Events, KazagumoPlayer } from "kazagumo";
import { type TrackExceptionEvent } from "shoukaku";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerStuck}`,
    event: Events.PlayerStuck,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer, _data: TrackExceptionEvent) {
        const { client } = this.container;
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));

        if (channel && channel.isTextBased()) {
            const title = createTitle(player.queue.current!);
            channel.send({
                embeds: [new EmbedBuilder().setDescription(`${title} throw an exeption when trying to play it`).setColor(KoosColor.Error)],
            });
        }
    }
}
