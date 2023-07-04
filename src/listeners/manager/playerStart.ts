import type { Player, Track } from "#lib/audio";
import { Events } from "#lib/types";
import { KoosColor } from "#utils/constants";
import { convertTime, createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { oneLine } from "common-tags";
import { EmbedBuilder } from "discord.js";

@ApplyOptions<Listener.Options>({
    emitter: container.manager,
    name: `manager:${Events.PlayerStart}`,
    event: Events.PlayerStart,
})
export class ClientListener extends Listener {
    public async run(player: Player, track: Track) {
        const { client, db } = this.container;

        const data = await db.guild.findUnique({ where: { id: player.guildId } });
        const channel =
            client.channels.cache.get(player.textChannel) ?? (await client.channels.fetch(player.textChannel).catch(() => null));
        const guild = client.guilds.cache.get(player.guildId) ?? (await client.guilds.fetch(player.guildId).catch(() => null));
        if (isNullish(channel) || isNullish(guild)) return;

        const title = createTitle(track);

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
