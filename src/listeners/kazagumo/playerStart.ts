import { Listener, container } from "@sapphire/framework";
import { KazagumoPlayer, KazagumoTrack, Events } from "kazagumo";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { EmbedColor } from "#utils/constants";
import { convertTime } from "#utils/functions";
import { Button } from "#lib/utils/constants";
import { oneLine } from "common-tags";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerStart}`,
    event: Events.PlayerStart,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer, track: KazagumoTrack) {
        const { client, db } = this.container;

        const data = await db.guild.findUnique({ where: { id: player.guildId } });
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));
        if (!channel) return;

        let title =
            track.sourceName == "youtube" ? `[${track.title}](${track.uri})` : `[${track.title} by ${track.author}](${track.uri})`;

        const embed = new EmbedBuilder() //
            .setDescription(
                oneLine`
                    ${title} [${track.isStream ? `Live` : convertTime(Number(track.length))}]
                    ${data?.requester ? ` ~ ${track.requester}` : ""}
                `
            )
            .setColor(EmbedColor.Default);
        const playerButtons = [
            new ButtonBuilder().setLabel("Pause").setCustomId(Button.PauseOrResume).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setLabel("Skip").setCustomId(Button.Skip).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel("Stop").setCustomId(Button.Stop).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setLabel("Show Queue").setCustomId(Button.ShowQueue).setStyle(ButtonStyle.Secondary),
        ];
        const row = new ActionRowBuilder<ButtonBuilder>().setComponents(playerButtons);

        if (channel.isTextBased()) {
            const msg = await channel.send({ embeds: [embed], components: [row] });
            player.data.set("nowPlayingMessage", msg);
        }
    }
}
