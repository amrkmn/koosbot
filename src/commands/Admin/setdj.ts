import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { removeItem, sendLoadingMessage } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { EmbedBuilder, Message, PermissionFlagsBits, Role } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Add or remove a DJ role.",
    permissions: [PermissionFlagsBits.ManageGuild],
    aliases: ["dj"],
    detailedDescription: {
        usages: [";role"],
    },
})
export class SetDJCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .addRoleOption((option) =>
                    option //
                        .setName("role")
                        .setDescription("The role that you want Add/Remove")
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const role = interaction.options.getRole("role") as Role | null;
        if (role) await interaction.deferReply();
        if (!role) return interaction.reply({ embeds: [await this.setdj(interaction.guildId!, undefined)] });

        interaction.followUp({ embeds: [await this.setdj(interaction.guildId!, role.id)] });
    }

    public async messageRun(message: Message, args: Args) {
        await sendLoadingMessage(message);
        const role = await args.pick("role").catch(() => undefined);
        if (!role && args.finished) return send(message, { embeds: [await this.setdj(message.guildId!, undefined)] });
        if (!role)
            return send(message, {
                embeds: [new EmbedBuilder().setDescription(`Role not found.`).setColor(KoosColor.Error)],
            });

        send(message, { embeds: [await this.setdj(message.guildId!, role.id)] });
    }

    private async setdj(guildId: string, roleId?: string) {
        const { db } = this.container;
        const data = await db.guild.findUnique({ where: { id: guildId } });
        if (!data) return new EmbedBuilder().setDescription(`There is no DJ role set.`).setColor(KoosColor.Warn);

        const dj = data.dj.map((id) => `<@&${id}>`);
        if (!roleId && isNullishOrEmpty(dj))
            return new EmbedBuilder().setDescription(`There is no DJ role set.`).setColor(KoosColor.Warn);
        if (!roleId)
            return new EmbedBuilder().setDescription(`**__Configured DJ role:__**\n\n${dj.join("\n")}`).setColor(KoosColor.Default);

        const isNewRole = data.dj.includes(roleId) ? false : true;
        const roles = isNewRole //
            ? [...data.dj, roleId]
            : removeItem(data.dj, roleId);

        await db.guild.upsert({
            where: { id: guildId },
            update: { dj: { set: roles } },
            create: { id: guildId, dj: { set: roles } },
        });

        return new EmbedBuilder()
            .setDescription(isNewRole ? `Added <@&${roleId}> to the DJ roles` : `Removed <@&${roleId}> from the DJ roles.`)
            .setColor(KoosColor.Default);
    }
}
