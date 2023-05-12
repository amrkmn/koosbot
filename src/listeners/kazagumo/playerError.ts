import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { Events, KazagumoPlayer } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerStuck}`,
    event: Events.PlayerStuck,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer,) {
        const { client } = this.container;
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));

        if (channel && channel.isTextBased()) {
            channel.send({
                embeds: [new EmbedBuilder().setDescription(`An error occured`).setColor(KoosColor.Error)],
            });
        }
    }
}
