import { Listener, container } from "@sapphire/framework";
import { KazagumoPlayer, KazagumoTrack, Events } from "kazagumo";
import { MessageEmbed } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

// container.kazagumo.on("playerStart", (player, track) => {});

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerStart}`,
    event: Events.PlayerStart,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer, track: KazagumoTrack) {
        const channel = await this.container.client.channels.fetch(player.textId);
        if (!channel) return;

        const embed = new MessageEmbed().setDescription(
            `Started playing [${track.title}](${track.uri}) ${track.requester ? `[${track.requester}]` : ""}`
        );

        if (channel.isText()) channel.send({ embeds: [embed] });
    }
}
