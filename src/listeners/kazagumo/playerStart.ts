import { Listener, container } from "@sapphire/framework";
import { KazagumoPlayer, KazagumoTrack, Events } from "kazagumo";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { embedColor } from "#utils/constants";
import { convertTime } from "#utils/functions";
import { buttons } from "#lib/utils/constants";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerStart}`,
    event: Events.PlayerStart,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer, track: KazagumoTrack) {
        const { client, db } = this.container;

        const data = await db.guilds.findUnique({ where: { id: player.guildId } });
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));
        if (!channel) return;

        let title =
            track.sourceName == "youtube" ? `[${track.title}](${track.uri})` : `[${track.title} by ${track.author}](${track.uri})`;

        const embed = new MessageEmbed() //
            .setDescription(
                [
                    `Started playing ${title} [${track.isStream ? `Live` : convertTime(Number(track.length))}]`,
                    `${data?.requester ? ` ~ ${track.requester}` : ""}`,
                ].join("")
            )
            .setColor(embedColor.default);
        const playerButtons = [
            new MessageButton().setLabel("Pause").setCustomId(buttons.pauseOrResume).setStyle("SUCCESS"),
            new MessageButton().setLabel("Skip").setCustomId(buttons.skip).setStyle("PRIMARY"),
            new MessageButton().setLabel("Stop").setCustomId(buttons.stop).setStyle("DANGER"),
            new MessageButton().setLabel("Show Queue").setCustomId(buttons.showQueue).setStyle("SECONDARY"),
        ];
        const row = new MessageActionRow().setComponents(playerButtons);

        if (channel.isText()) {
            const msg = await channel.send({ embeds: [embed], components: [row] });
            player.data.set("nowPlayingMessage", msg);
        }
    }
}
