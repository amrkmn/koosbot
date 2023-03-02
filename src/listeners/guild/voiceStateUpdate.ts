import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish, Nullish } from "@sapphire/utilities";
import { envParseString } from "@skyra/env-utilities";
import { Guild, Message, MessageActionRow, MessageButton, MessageEmbed, VoiceBasedChannel, VoiceState } from "discord.js";
import { Buttons, embedColor } from "#utils/constants";
import { KazagumoPlayer } from "kazagumo";
import { reply } from "@sapphire/plugin-editable-commands";
import { time } from "#utils/functions";
import { oneLine } from "common-tags";
import ms from "ms";

@ApplyOptions<Listener.Options>({
    event: Events.VoiceStateUpdate,
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

        const npMessage = player.data.get("nowPlayingMessage") as Message;

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
            new MessageButton()
                .setLabel(paused ? "Resume" : "Pause")
                .setCustomId(Buttons.PauseOrResume)
                .setStyle("SUCCESS"),
            new MessageButton().setLabel("Skip").setCustomId(Buttons.Skip).setStyle("PRIMARY"),
            new MessageButton().setLabel("Stop").setCustomId(Buttons.Stop).setStyle("DANGER"),
            new MessageButton().setLabel("Show Queue").setCustomId(Buttons.ShowQueue).setStyle("SECONDARY"),
        ];
        const row = new MessageActionRow().setComponents(playerButtons);

        return row;
    }

    checkState(oldState: VoiceState, newState: VoiceState) {
        if (oldState.member?.user.bot || newState.member?.user.bot) return "BOT";

        if (isNullish(newState.channel)) return "LEFT";
        else if (isNullish(oldState.channel)) return "JOINED";
        else return "MOVED";
    }

    deleteMessage(msg: Message, time: number) {
        setTimeout(() => {
            if (msg.deletable) msg.delete();
        }, time);
    }

    async setup(guild: Guild | null, player: KazagumoPlayer) {
        if (typeof this.timeoutId !== "undefined") this.cancel();

        const { client } = this.container;
        const channel =
            this.container.client.channels.cache.get(player.textId) ?? (await client.channels.fetch(player.textId).catch(() => null));
        if (isNullish(guild) || isNullish(player) || isNullish(channel)) return this.cancel();

        this.timeoutId = setTimeout(() => {
            if (!isNullish(guild.members.me?.voice.channelId)) {
                player.destroy();
                if (channel.isText())
                    channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setDescription(`No one was listening for ${ms(this.leaveAfter, { long: true })}, leaving.`)
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
