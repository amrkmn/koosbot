import { envParseString } from "@skyra/env-utilities";
import { KoosColor } from "#utils/constants";
import { time } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Guild, Message, EmbedBuilder } from "discord.js";
import { Events, KazagumoPlayer } from "kazagumo";
import ms from "ms";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerEmpty}`,
    event: Events.PlayerEmpty,
})
export class ClientListener extends Listener {
    _timeoutId: NodeJS.Timeout | undefined;
    _leaveAfter: number = envParseString("NODE_ENV") === "production" ? time("mins", 3) : time("sec", 25);

    public async run(player: KazagumoPlayer) {
        const { client } = this.container;
        const guild = client.guilds.cache.get(player.guildId) ?? (await client.guilds.fetch(player.guildId).catch(() => null));
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));
        if (isNullish(guild) || isNullish(player) || isNullish(channel)) return;

        if (player.queue.current) return;

        const npMessage = player.dashboard();

        if (channel && channel.isTextBased() && npMessage instanceof Message) {
            const msg = channel.messages.cache.get(npMessage.id) ?? (await channel.messages.fetch(npMessage.id).catch(() => null));

            if (!isNullish(msg) && msg.editable) {
                msg.edit({ components: [] });
                player.resetDashboard();
                player.history.clear();
            }
        }

        await this.setupTimeout(guild, player);
    }

    async setupTimeout(guild: Guild | null, player: KazagumoPlayer) {
        if (typeof this._timeoutId !== "undefined") this.cancelTimeout();

        const { client, kazagumo } = this.container;
        const channel =
            container.client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));
        if (isNullish(guild) || isNullish(player) || isNullish(channel)) return this.cancelTimeout();

        this._timeoutId = setTimeout(() => {
            const player = kazagumo.getPlayer(guild.id);
            if (isNullish(player)) return this.cancelTimeout();
            if (player.queue.current) return this.cancelTimeout();
            if (!player.queue.isEmpty && isNullish(guild.members.me?.voice.channelId)) return this.cancelTimeout();
            if (!channel.isTextBased()) return this.cancelTimeout();

            player.destroy();
            channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`No tracks have been playing for the past ${ms(this._leaveAfter, { long: true })}, leaving.`)
                        .setColor(KoosColor.Error),
                ],
            });
        }, this._leaveAfter);
    }
    resetTimeout() {
        this._timeoutId = undefined;
    }
    cancelTimeout() {
        clearTimeout(this._timeoutId);
        this.resetTimeout();
    }
}
