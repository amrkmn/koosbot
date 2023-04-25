import { Listener, container } from "@sapphire/framework";
import { KazagumoPlayer, KazagumoTrack, Events } from "kazagumo";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { KoosColor } from "#utils/constants";
import { convertTime, createTitle } from "#utils/functions";
import { ButtonId } from "#lib/utils/constants";
import { oneLine } from "common-tags";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";

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
        if (isNullish(channel)) return;

        const previousTracks = player.previous();

        const title = createTitle(track);

        const embed = new EmbedBuilder() //
            .setDescription(
                oneLine`
                    ${title} [${track.isStream ? `Live` : convertTime(Number(track.length))}]
                    ${data?.requester ? ` ~ ${track.requester}` : ""}
                `
            )
            .setColor(KoosColor.Default);
        const playerButtons = [
            new ButtonBuilder().setLabel("Pause").setCustomId(ButtonId.PauseOrResume).setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel("Previous")
                .setCustomId(ButtonId.Previous)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(isNullishOrEmpty(previousTracks)),
            new ButtonBuilder().setLabel("Skip").setCustomId(ButtonId.Skip).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel("Stop").setCustomId(ButtonId.Stop).setStyle(ButtonStyle.Danger),
        ];
        const row = new ActionRowBuilder<ButtonBuilder>().setComponents(playerButtons);

        if (channel.isTextBased()) {
            const msg = await channel.send({ embeds: [embed], components: [row] });
            player.nowPlaying(msg);
        }
    }
}
