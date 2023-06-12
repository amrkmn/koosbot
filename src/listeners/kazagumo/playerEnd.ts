import { ApplyOptions } from "@sapphire/decorators";
import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Events, KazagumoPlayer, KazagumoTrack } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerEnd}`,
    event: Events.PlayerEnd,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer, track?: KazagumoTrack) {
        const { client } = this.container;
        const npMessage = player.dashboard();
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));

        if (!isNullish(track)) player.history.tracks.add(track);

        if (channel && channel.isTextBased() && isMessageInstance(npMessage)) {
            const msg = channel.messages.cache.get(npMessage.id) ?? (await channel.messages.fetch(npMessage.id).catch(() => null));

            if (!isNullish(msg) && msg.editable) {
                msg.edit({ components: [] });
                player.votes.clear();
                player.resetDashboard();
            }
        }
    }
}
