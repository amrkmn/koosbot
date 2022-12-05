import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { ScheduledTask } from "@sapphire/plugin-scheduled-tasks";
import { isNullish } from "@sapphire/utilities";
import { MessageEmbed } from "discord.js";

@ApplyOptions<ScheduledTask.Options>({
    name: "kazagumoLeave",
    bullJobsOptions: {
        removeOnComplete: true,
    },
})
export class ClientTask extends ScheduledTask {
    public async run({ channelId, guildId }: { channelId: string; guildId: string }) {
        const { kazagumo, client } = this.container;
        const player = kazagumo.getPlayer(guildId);
        const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
        const channel = client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId));
        if (isNullish(player) || isNullish(channel)) return;

        if (channel.isText()) {
            if (player.queue.isEmpty && !isNullish(guild.me?.voice.channelId)) {
                player.destroy();
                channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setDescription(`No tracks have been playing for the past 3 minutes, leaving.`)
                            .setColor(embedColor.error),
                    ],
                });
            }
        }
    }
}

declare module "@sapphire/plugin-scheduled-tasks" {
    interface ScheduledTasks {
        kazagumoLeave: never;
    }
}
