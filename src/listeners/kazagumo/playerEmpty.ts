import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { Events, KazagumoPlayer, PlayerState } from "kazagumo";
import ms from "ms";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerEmpty}`,
    event: Events.PlayerEmpty,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer) {
        const channel = container.client.channels.cache.get(player.textId) ?? (await container.client.channels.fetch(player.textId));
        if (!channel) return;

        if (channel.isText()) channel.send({ embeds: [{ description: "There are no more tracks", color: embedColor.error }] });

        const leaveAfterTime = setTimeout(() => {
            console.log(player.queue.isEmpty, player.state === PlayerState.CONNECTED);
            if (player.queue.isEmpty && player.state === PlayerState.CONNECTED) {
                player.disconnect();
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
        }, ms("10s"));
    }
}
