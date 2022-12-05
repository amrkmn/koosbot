import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { ScheduledTask } from "@sapphire/plugin-scheduled-tasks";

@ApplyOptions<ScheduledTask.Options>({
    name: "kazagumoLeave",
    bullJobsOptions: {
        removeOnComplete: true,
    },
})
export class ClientTask extends ScheduledTask {
    public async run({ channelId, guildId }: { channelId: string; guildId: string }) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(guildId);
        const channel = this.container.client.channels.cache.get(channelId) ?? (await this.container.client.channels.fetch(channelId));
        if (!player || !channel) return;

        if (channel.isText()) {
            player.destroy();
            channel.send({
                embeds: [
                    {
                        description: `No tracks have been playing for the past 3 minutes, leaving.`,
                        color: embedColor.error,
                    },
                ],
            });
        }
    }
}

declare module "@sapphire/plugin-scheduled-tasks" {
    interface ScheduledTasks {
        kazagumoLeave: never;
    }
}
