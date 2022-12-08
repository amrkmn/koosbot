import { envParseString } from "#env";
import { embedColor } from "#utils/constants";
import { mins, sec } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { Events, KazagumoPlayer } from "kazagumo";

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

        this.container.tasks.create(
            "kazagumoLeave",
            { channelId: channel.id, guildId: guild.id },
            envParseString("NODE_ENV") === "production" ? mins(3) : sec(25)
        );
        return;
    }
}
