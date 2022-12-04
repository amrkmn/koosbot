import { embedColor } from "#utils/constants";
import { mins } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { Events, KazagumoPlayer } from "kazagumo";
import { isNullish } from "@sapphire/utilities";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerEmpty}`,
    event: Events.PlayerEmpty,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer) {
        const { client } = this.container;
        const guild = client.guilds.cache.get(player.guildId) ?? (await client.guilds.fetch(player.guildId));
        const channel = container.client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId));
        if (!channel || !guild) return;

        if (channel.isText()) channel.send({ embeds: [{ description: "There are no more tracks", color: embedColor.error }] });

        const leaveAfterTime = setTimeout(() => {
            if (player.queue.isEmpty && !isNullish(guild.me?.voice.channelId)) {
                player.destroy();
                if (channel.isText())
                    channel.send({
                        embeds: [
                            {
                                description: `No tracks have been playing for the past 3 minutes, leaving.`,
                                color: embedColor.error,
                            },
                        ],
                    });
            }
            clearTimeout(leaveAfterTime);
        }, mins(3));
    }
}
