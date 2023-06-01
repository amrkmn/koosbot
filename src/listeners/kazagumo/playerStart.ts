import { KoosColor } from "#utils/constants";
import { convertTime, createTitle, cutText } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { isStageChannel } from "@sapphire/discord.js-utilities";
import { Listener, container } from "@sapphire/framework";
import { isNullish, noop } from "@sapphire/utilities";
import { oneLine } from "common-tags";
import { EmbedBuilder } from "discord.js";
import { Events, KazagumoPlayer, KazagumoTrack } from "kazagumo";

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
        const voiceChannel =
            client.channels.cache.get(player.voiceId!) ?? (await client.channels.fetch(player.voiceId!).catch(() => null));
        const guild = client.guilds.cache.get(player.guildId) ?? (await client.guilds.fetch(player.guildId).catch(() => null));
        if (isNullish(channel) || isNullish(guild)) return;

        const title = createTitle(track);
        const cleanTitle = createTitle(track, false);

        if (!isNullish(voiceChannel) && isStageChannel(voiceChannel)) {
            const stageChannel =
                guild.stageInstances.cache.get(voiceChannel.id) ??
                (await guild.stageInstances.fetch(voiceChannel.id).catch(() => null));

            if (isNullish(stageChannel)) return;
            await stageChannel.edit({ topic: cutText(cleanTitle, 120) }).catch(noop);
        }

        const embed = new EmbedBuilder() //
            .setDescription(
                oneLine`
                    ${title} [${track.isStream ? `Live` : convertTime(Number(track.length))}]
                    ${data?.requester ? ` ~ ${track.requester}` : ""}
                `
            )
            .setColor(KoosColor.Default);

        if (channel.isTextBased()) {
            const msg = await channel.send({ embeds: [embed], components: [player.createPlayerComponents()] });
            player.dashboard(msg);
        }
    }
}
