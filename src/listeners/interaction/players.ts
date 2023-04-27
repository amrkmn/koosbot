import { ButtonId } from "#lib/utils/constants";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    Guild,
    GuildMember,
    Interaction,
    Message
} from "discord.js";

@ApplyOptions<Listener.Options>({
    name: "players",
    event: Events.InteractionCreate,
})
export class ClientListener extends Listener {
    public async run(interaction: Interaction) {
        if (!interaction.isButton()) return;
        const player = this.container.kazagumo.getPlayer(interaction.guildId!);
        const data = await this.container.db.guild.findUnique({ where: { id: interaction.guildId! } });
        if (isNullish(player) || isNullish(data)) return;

        const npMessage = player.nowPlaying();

        const id = interaction.customId as ButtonId;
        const checkMember = this.checkMember(interaction.guild!, interaction.member as GuildMember);

        if (Object.values(ButtonId).includes(id)) await interaction.deferUpdate();
        if (!isNullish(checkMember)) return interaction.followUp({ embeds: [checkMember], ephemeral: true });
        if (
            [ButtonId.PauseOrResume, ButtonId.Previous, ButtonId.Skip, ButtonId.Stop].includes(id) && //
            !this.checkDJ(interaction, data.dj)
        )
            return interaction.followUp({
                embeds: [new EmbedBuilder().setDescription(`This button can only be use by DJ.`).setColor(KoosColor.Error)],
                ephemeral: true,
            });

        switch (id) {
            case ButtonId.PauseOrResume:
                const previousTrack = player.previous();
                player.pause(!player.paused);
                npMessage.edit({ components: [this.buttons(player.paused, isNullishOrEmpty(previousTrack))] });
                break;
            case ButtonId.Previous:
                const prevTrack = player.previousTrack();
                if (isNullish(prevTrack)) return;
                player.play(prevTrack);
                break;
            case ButtonId.Skip:
                player.skip();
                break;
            case ButtonId.Stop:
                player.queue.clear();
                player.skip();
                break;
        }
    }

    private checkMember(guild: Guild | null, member: GuildMember) {
        if (!guild) return new EmbedBuilder().setDescription("You cannot run this message command in DMs.").setColor(KoosColor.Error);
        if (
            !isNullish(guild.members.me) &&
            !isNullish(member.voice.channel) && //
            !isNullish(guild.members.me.voice.channel) &&
            member.voice.channelId !== guild.members.me!.voice.channelId
        )
            return new EmbedBuilder()
                .setDescription(
                    `You aren't connected to the same voice channel as I am. I'm currently connected to ${guild.members.me.voice.channel}`
                )
                .setColor(KoosColor.Error);

        return !isNullish(member.voice.channel) //
            ? undefined
            : new EmbedBuilder().setDescription("You aren't connected to a voice channel.").setColor(KoosColor.Error);
    }

    private checkDJ(message: Message | ButtonInteraction, dj: string[]) {
        const member = message.member as GuildMember;

        const roles = [...member.roles.cache.keys()].filter((id) => dj.includes(id));

        return !isNullishOrEmpty(roles);
    }

    private buttons(paused = false, firstTrack: boolean) {
        return new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
                .setCustomId(ButtonId.PauseOrResume)
                .setStyle(ButtonStyle.Success)
                .setLabel(!paused ? "Pause" : "Resume"),
            new ButtonBuilder()
                .setCustomId(ButtonId.Previous)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Previous")
                .setDisabled(firstTrack),
            new ButtonBuilder().setCustomId(ButtonId.Skip).setStyle(ButtonStyle.Primary).setLabel("Skip"),
            new ButtonBuilder().setCustomId(ButtonId.Stop).setStyle(ButtonStyle.Danger).setLabel("Stop")
        );
    }
}
