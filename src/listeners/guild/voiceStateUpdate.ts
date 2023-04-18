import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish, Nullish } from "@sapphire/utilities";
import { envParseString } from "@skyra/env-utilities";
import { Guild, Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, VoiceBasedChannel, VoiceState, ButtonStyle } from "discord.js";
import { Button, KoosColor } from "#utils/constants";
import { KazagumoPlayer } from "kazagumo";
import { getNp, time } from "#utils/functions";
import ms from "ms";

@ApplyOptions<Listener.Options>({
    event: Events.VoiceStateUpdate,
    enabled: false,
})
export class ClientListener extends Listener {
    timeoutId: NodeJS.Timeout | undefined;
    leaveAfter: number = envParseString("NODE_ENV") === "production" ? time("mins", 3) : time("sec", 25);

    public async run(oldState: VoiceState, newState: VoiceState) {
        const { client, kazagumo } = this.container;

        let clientVc: VoiceBasedChannel | Nullish = null;
        if (oldState.channel?.members.has(`${client.id}`)) clientVc = oldState.channel;
        else if (newState.channel?.members.has(`${client.id}`)) clientVc = newState.channel;

        if (isNullish(clientVc)) return;

        const player = kazagumo.getPlayer(clientVc.guildId);
        if (isNullish(player)) return;

        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));
        if (isNullish(channel)) return;

        const npMessage = getNp(player);

        const state = this.checkState(oldState, newState);
        const vcSize = clientVc.members.filter((x) => client.user?.id === x.id || !x.user.bot).size;

        if (state === "LEFT" && vcSize <= 1 && player.paused) this.setup(clientVc.guild, player);
        else {
            if (["LEFT", "JOINED"].includes(state)) {
                this.cancel();
                if (state === "JOINED" && vcSize === 2 && player.paused) player.pause(false);
                if (npMessage.editable) npMessage.edit({ components: [this.createButtons(player.paused)] });
            }
        }
    }

    createButtons(paused: boolean) {
        const playerButtons = [
            new ButtonBuilder()
                .setLabel(paused ? "Resume" : "Pause")
                .setCustomId(Button.PauseOrResume)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder().setLabel("Skip").setCustomId(Button.Skip).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel("Stop").setCustomId(Button.Stop).setStyle(ButtonStyle.Danger),
            // new ButtonBuilder().setLabel("Show Queue").setCustomId(Button.ShowQueue).setStyle(ButtonStyle.Secondary),
        ];
        return new ActionRowBuilder<ButtonBuilder>().setComponents(playerButtons);
    }

    checkState(oldState: VoiceState, newState: VoiceState) {
        if (oldState.member?.user.bot || newState.member?.user.bot) return "BOT";

        if (isNullish(newState.channel)) return "LEFT";
        else if (isNullish(oldState.channel)) return "JOINED";
        else return "MOVED";
    }

    async setup(guild: Guild | null, player: KazagumoPlayer) {
        if (typeof this.timeoutId !== "undefined") this.cancel();

        const { client } = this.container;
        const channel = client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));
        if (isNullish(guild) || isNullish(player) || isNullish(channel)) return this.cancel();

        this.timeoutId = setTimeout(() => {
            if (!isNullish(guild.members.me?.voice.channelId)) {
                player.destroy();
                if (channel.isTextBased())
                    channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`No one was listening for ${ms(this.leaveAfter, { long: true })}, leaving.`)
                                .setColor(KoosColor.Error),
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
