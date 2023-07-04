import { ButtonId } from "#lib/utils/constants";
import { KoosColor } from "#utils/constants";
import { checkDJ, checkMember } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish, noop } from "@sapphire/utilities";
import { EmbedBuilder, GuildMember, type Interaction } from "discord.js";

@ApplyOptions<Listener.Options>({
    name: `${Events.InteractionCreate}:dashboard`,
    event: Events.InteractionCreate,
})
export class ClientListener extends Listener {
    public async run(interaction: Interaction) {
        if (!interaction.isButton()) return;
        const player = this.container.manager.players.get(interaction.guildId!);
        const data = await this.container.db.guild.findUnique({ where: { id: interaction.guildId! } });
        if (isNullish(player) || isNullish(data)) return;

        const dashboard = player.dashboard();
        const member = interaction.member as GuildMember;

        const id = interaction.customId as ButtonId;
        const checkedMember = checkMember(interaction.guild!, member);

        if (![ButtonId.PauseOrResume, ButtonId.Previous, ButtonId.Skip, ButtonId.Stop].includes(id)) return;

        await interaction.deferUpdate();
        if (!isNullish(checkedMember)) return interaction.followUp({ embeds: [checkedMember], ephemeral: true });
        if (!checkDJ(member, data.dj))
            return interaction.followUp({
                embeds: [new EmbedBuilder().setDescription(`This button can only be used by DJ.`).setColor(KoosColor.Error)],
                ephemeral: true,
            });

        switch (id) {
            case ButtonId.PauseOrResume:
                player.pause(!player.paused);
                dashboard.edit({ components: [player.createPlayerComponents()] });
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
}
