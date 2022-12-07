import { Listener, container } from "@sapphire/framework";
import { KazagumoPlayer, KazagumoTrack, Events } from "kazagumo";
import { MessageEmbed } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { embedColor } from "#utils/constants";

// container.kazagumo.on("playerEnd", (player, track) => {});

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerStart}`,
    event: Events.PlayerStart,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer, track: KazagumoTrack) {
        const channel =
            this.container.client.channels.cache.get(player.textId) ?? (await this.container.client.channels.fetch(player.textId));
        if (!channel) return;

        let title =
            track.sourceName == "youtube" ? `[${track.title}](${track.uri})` : `[${track.title} by ${track.author}](${track.uri})`;

        const embed = new MessageEmbed() //
            .setDescription(`Started playing ${title} ${track.requester ? `[${track.requester}]` : ""}`)
            .setColor(embedColor.default);

        if (channel.isText()) channel.send({ embeds: [embed] });
    }
}
