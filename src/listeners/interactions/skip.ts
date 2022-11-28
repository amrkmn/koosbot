import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Events } from "@sapphire/framework";
import { GuildMember, Interaction } from "discord.js";
import pluralize from "pluralize";

@ApplyOptions<Listener.Options>({
    name: `${Events.InteractionCreate}:skip`,
    event: Events.InteractionCreate,
    enabled: false,
})
export class UserListener extends Listener {
    public async run(interaction: Interaction) {
        if (!interaction.guild || !interaction.guildId) return;
        if (!interaction.isButton() || interaction.customId !== "skip") return;

        const { db, kazagumo } = this.container;

        const votes = new Set<string>();
        const data = await db.guild.findUnique({ where: { id: interaction.guildId }, select: { dj: true } });
        const player = kazagumo.getPlayer(interaction.guildId);
        const member = interaction.member as GuildMember;
        const channel = member.voice.channel;
        if (!player) return interaction.reply({ content: "There's nothing playing in this server", ephemeral: true });
        if (!channel) return interaction.reply({ content: "You aren't connected to a voice channel", ephemeral: true });
        if (player.queue.current && !player.queue.length)
            return interaction.reply({ content: "There is no track playing", ephemeral: true });

        const current = player.queue.current;
        const title = `[${current?.title}](${current?.uri})`;
        const members = channel && Math.ceil(channel?.members.size / 2);

        if (votes.has(member.id)) {
            votes.delete(member.id);
            return interaction.reply({ content: "You already voted to skip, so I revoked your vote!", ephemeral: true });
        } else if (votes.has(member.id) && data && member.roles.cache.has(data.dj)) {
            player.skip();
            interaction.reply({ content: `Skipped ${title} by ${member}` });
        } else {
            votes.add(member.id);
            interaction.reply({
                content: `You voted to skip ${title} there are currently [${votes.size}/${members} ${pluralize("Vote", votes.size)}]`,
            });
        }

        if (votes.size === members) player.skip();
    }
}
