import type { Player } from "#lib/audio";
import { Events } from "#lib/types";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import type { TrackStuckEvent } from "shoukaku";

@ApplyOptions<Listener.Options>({
    emitter: container.manager,
    name: `manager:${Events.PlayerError}`,
    event: Events.PlayerError,
})
export class ClientListener extends Listener {
    public async run(player: Player, _data: TrackStuckEvent) {
        const { client } = this.container;
        const channel =
            client.channels.cache.get(player.textChannel) ?? (await client.channels.fetch(player.textChannel).catch(() => null));

        if (channel && channel.isTextBased()) {
            channel.send({
                embeds: [new EmbedBuilder().setDescription(`An error occured`).setColor(KoosColor.Error)],
            });
        }
    }
}
