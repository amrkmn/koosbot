import { envParseString } from "#env";
import { embedColor } from "#utils/constants";
import { mins, sec } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Guild, Message, MessageEmbed } from "discord.js";
import { Events, KazagumoPlayer } from "kazagumo";
import ms from "ms";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerEmpty}`,
    event: Events.PlayerEmpty,
})
export class ClientListener extends Listener {
    timeoutId: NodeJS.Timeout | undefined;
    leaveAfter: number = envParseString("NODE_ENV") === "production" ? mins(3) : sec(25);

    public async run(player: KazagumoPlayer) {
        const { client } = this.container;
        const guild = client.guilds.cache.get(player.guildId) ?? (await client.guilds.fetch(player.guildId));
        const channel = container.client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId));
        if (isNullish(guild) || isNullish(player) || isNullish(channel)) return;

        if (player.queue.current) return;

        const msg = player.data.get("nowPlayingMessage");
        if (!isNullish(msg) && msg instanceof Message && msg.deletable) msg.delete();
        // if (channel.isText()) channel.send({ embeds: [{ description: "There are no more tracks", color: embedColor.error }] });

        await this.setup(guild, player);
        return;
    }

    async setup(guild: Guild | null, player: KazagumoPlayer) {
        if (typeof this.timeoutId !== "undefined") this.cancel();

        const { client } = this.container;
        const channel = container.client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId));
        if (isNullish(guild) || isNullish(player) || isNullish(channel)) return this.cancel();

        this.timeoutId = setTimeout(() => {
            if (player.queue.current) return this.cancel();
            if (player.queue.isEmpty && !isNullish(guild.me?.voice.channelId)) {
                player.destroy();
                if (channel.isText())
                    channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setDescription(
                                    `No tracks have been playing for the past ${ms(this.leaveAfter, { long: true })}, leaving.`
                                )
                                .setColor(embedColor.error),
                        ],
                    });
            }
        }, this.leaveAfter);
    }
    reset() {
        this.timeoutId = undefined;
    }
    cancel() {
        clearTimeout(this.timeoutId);
        this.reset();
    }
}
