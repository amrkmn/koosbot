import { ButtonId } from "#lib/utils/constants";
import { KoosColor } from "#utils/constants";
import { checkDJ, checkMember } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish, isNullishOrEmpty, noop } from "@sapphire/utilities";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, Interaction } from "discord.js";

@ApplyOptions<Listener.Options>({
    name: "dashboard",
    event: Events.InteractionCreate,
})
export class ClientListener extends Listener {
    public async run(interaction: Interaction) {
        if (!interaction.isButton()) return;
        const player = this.container.kazagumo.getPlayer(interaction.guildId!);
        const data = await this.container.db.guild.findUnique({ where: { id: interaction.guildId! } });
        if (isNullish(player) || isNullish(data)) return;

        const dashboard = player.dashboard();
        const member = interaction.member as GuildMember;

        const id = interaction.customId as ButtonId;
        const checkedMember = checkMember(interaction.guild!, member);

        if (Object.values(ButtonId).includes(id)) await interaction.deferUpdate();
        if (!isNullish(checkedMember)) return interaction.followUp({ embeds: [checkedMember], ephemeral: true });
        if (!checkDJ(member, data.dj))
            return interaction.followUp({
                embeds: [new EmbedBuilder().setDescription(`This button can only be used by DJ.`).setColor(KoosColor.Error)],
                ephemeral: true,
            });

        switch (id) {
            case ButtonId.PauseOrResume:
                const previousTrack = player.history.previousTrack;
                player.pause(!player.paused);
                dashboard.edit({ components: [this.buttons(player.paused, isNullishOrEmpty(previousTrack))] });
                break;
            case ButtonId.Previous:
                player.history.previous().catch(noop);
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
