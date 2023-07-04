import type { Player, Track } from "#lib/audio";
import { Events } from "#lib/types";
import { KoosColor } from "#utils/constants";
import { createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";

@ApplyOptions<Listener.Options>({
    emitter: container.manager,
    name: `manager:${Events.PlayerResolveError}`,
    event: Events.PlayerResolveError,
})
export class ClientListener extends Listener {
    public async run(player: Player, track: Track, _message?: string) {
        const { client } = this.container;
        const channel =
            client.channels.cache.get(player.textChannel) ?? (await client.channels.fetch(player.textChannel).catch(() => null));

        if (channel && channel.isTextBased()) {
            const title = createTitle(track);
            channel.send({
                embeds: [new EmbedBuilder().setDescription(`An error occured when resolving ${title}`).setColor(KoosColor.Error)],
            });
        }
    }
}
