import { KoosColor } from "#utils/constants";
import { time } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish, type Nullish } from "@sapphire/utilities";
import { envParseString } from "@skyra/env-utilities";
import { EmbedBuilder, Guild, type VoiceBasedChannel, VoiceState } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import ms from "ms";

@ApplyOptions<Listener.Options>({
    event: Events.VoiceStateUpdate,
})
export class ClientListener extends Listener {
    private _timeoutId: NodeJS.Timeout | undefined = undefined;
    private _leaveAfter: number = envParseString("NODE_ENV") === "production" ? time("mins", 1) : time("sec", 25);

    public async run(old: VoiceState, voiceState: VoiceState) {
        const { client, kazagumo } = this.container;

        let clientVc: VoiceBasedChannel | Nullish = null;
        if (old.channel?.members.has(`${client.id}`)) clientVc = old.channel;
        else if (voiceState.channel?.members.has(`${client.id}`)) clientVc = voiceState.channel;

        if (isNullish(clientVc)) return;

        const player = kazagumo.getPlayer(clientVc.guildId);
        if (isNullish(player)) return;

        const state = this.checkState(old, voiceState);
        if (state === "BOT" || state === "OTHERS") return;

        const listeners = clientVc.members.filter((x) => client.user?.id === x.id || !x.user.bot);

        if (state === "JOINED") this.cancelTimeout();
        else if (["LEFT", "MOVED"].includes(state) && listeners.size <= 1) this.setupTimeout(clientVc.guild, player);
        else if (["LEFT", "MOVED"].includes(state) && listeners.size > 1) this.cancelTimeout();
        else this.cancelTimeout();
    }

    private checkState(oldState: VoiceState, newState: VoiceState) {
        if (oldState.member?.user.bot || newState.member?.user.bot) return "BOT";

        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        if (isNullish(newChannel)) return "LEFT";
        else if (isNullish(oldChannel)) return "JOINED";
        else if (oldChannel.id !== newChannel.id) return "MOVED";
        else return "OTHERS";
    }

    private async setupTimeout(guild: Guild | null, player: KazagumoPlayer) {
        if (typeof this._timeoutId !== "undefined") this.cancelTimeout();

        const { client } = this.container;
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));
        if (isNullish(guild) || isNullish(player) || isNullish(channel)) return this.cancelTimeout();
        const time = ms(this._leaveAfter, { long: true });

        const checking = () => {
            if (isNullish(guild.members.me?.voice.channelId)) return this.cancelTimeout();

            player.destroy();
            if (channel.isTextBased())
                channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`Left the channel after ${time} due to channel inactivity`)
                            .setColor(KoosColor.Error),
                    ],
                });
        };

        this._timeoutId = setTimeout(checking, this._leaveAfter);
    }
    private cancelTimeout() {
        clearTimeout(this._timeoutId);
        this._timeoutId = undefined;
    }
}
