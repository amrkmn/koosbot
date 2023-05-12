import { KoosColor } from "#utils/constants";
import { createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { Events, KazagumoPlayer, KazagumoTrack } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerResolveError}`,
    event: Events.PlayerResolveError,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer, track: KazagumoTrack, _message?: string) {
        const { client } = this.container;
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));

        if (channel && channel.isTextBased()) {
            const title = createTitle(track);
            channel.send({
                embeds: [new EmbedBuilder().setDescription(`An error occured when resolving ${title}`).setColor(KoosColor.Error)],
            });
        }
    }
}
