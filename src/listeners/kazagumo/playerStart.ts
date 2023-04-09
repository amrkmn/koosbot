import { Listener, container } from "@sapphire/framework";
import { KazagumoPlayer, KazagumoTrack, Events, RawTrack } from "kazagumo";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { KoosColor } from "#utils/constants";
import { convertTime } from "#utils/functions";
import { Button } from "#lib/utils/constants";
import { oneLine } from "common-tags";
import { isNullish } from "@sapphire/utilities";

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

        const queue = player.data.get("queue") as RawTrack[];
        const currentIndex = queue.findIndex((rawTrack) => rawTrack.track === track.track);

        const previousTrack = queue[currentIndex - 1];

        let title =
            track.sourceName == "youtube" ? `[${track.title}](${track.uri})` : `[${track.title} by ${track.author}](${track.uri})`;

        const embed = new EmbedBuilder() //
            .setDescription(
                oneLine`
                    ${title} [${track.isStream ? `Live` : convertTime(Number(track.length))}]
                    ${data?.requester ? ` ~ ${track.requester}` : ""}
                `
            )
            .setColor(KoosColor.Default);
        const playerButtons = [
            new ButtonBuilder().setLabel("Pause").setCustomId(Button.PauseOrResume).setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel("Previous")
                .setCustomId(Button.Previous)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(isNullish(previousTrack)),
            new ButtonBuilder().setLabel("Skip").setCustomId(Button.Skip).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel("Stop").setCustomId(Button.Stop).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setLabel("Show Queue").setCustomId(Button.ShowQueue).setStyle(ButtonStyle.Secondary),
        ];
        const row = new ActionRowBuilder<ButtonBuilder>().setComponents(playerButtons);

        if (channel.isTextBased()) {
            const msg = await channel.send({ embeds: [embed], components: [row] });
            player.data.set("nowPlayingMessage", msg);
            player.data.set("currentTrack", track.getRaw());
        }
    }
}
