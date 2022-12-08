import { envParseString } from "#env";
import { embedColor } from "#utils/constants";
import { mins, sec } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Guild, MessageEmbed } from "discord.js";
import { Events, KazagumoPlayer } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerEmpty}`,
    event: Events.PlayerEmpty,
})
export class ClientListener extends Listener {
    timeoutId: NodeJS.Timeout | undefined;

    public async run(player: KazagumoPlayer) {
        const { client } = this.container;
        const guild = client.guilds.cache.get(player.guildId) ?? (await client.guilds.fetch(player.guildId));
        const channel = container.client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId));
        if (isNullish(guild) || isNullish(player) || isNullish(channel)) return;

        if (player.queue.current) return;

        if (channel.isText()) channel.send({ embeds: [{ description: "There are no more tracks", color: embedColor.error }] });

        await this.setup(guild, player);

        // this.container.tasks.create(
        //     "kazagumoLeave",
        //     { channelId: channel.id, guildId: guild.id },
        //     envParseString("NODE_ENV") === "production" ? mins(3) : sec(25)
        // );
        return;
    }

    remind() {
        this.timeoutId = undefined;
    }
    async setup(guild: Guild | null, player: KazagumoPlayer) {
        if (typeof this.timeoutId !== "undefined") this.cancel();

        const { client } = this.container;
        const channel = container.client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId));
        if (isNullish(guild) || isNullish(player) || isNullish(channel)) return this.cancel();

        this.timeoutId = setTimeout(
            () => {
                if (player.queue.current) return this.cancel();
                if (player.queue.isEmpty && !isNullish(guild.me?.voice.channelId)) {
                    player.destroy();
                    if (channel.isText())
                        channel.send({
                            embeds: [
                                new MessageEmbed()
                                    .setDescription(`No tracks have been playing for the past 3 minutes, leaving.`)
                                    .setColor(embedColor.error),
                            ],
                        });
                }
            },
            envParseString("NODE_ENV") === "production" ? mins(3) : sec(25)
        );
    }
    cancel() {
        clearTimeout(this.timeoutId);
    }
}
