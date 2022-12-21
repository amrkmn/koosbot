import { KoosCommand } from "#lib/extensions";
import { embedColor, zws } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { MessageEmbed, Message, Role } from "discord.js";
// import { isNullishOrEmpty } from "@sapphire/utilities";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { removeItem } from "#utils/functions";
import { PermissionLevels } from "#lib/types/Enums";

@ApplyOptions<KoosCommand.Options>({
    description: "Add or remove a DJ role.",
    aliases: ["dj"],
    permissionLevels: PermissionLevels.Administrator,
    usage: {
        types: [{ type: "role" }],
    },
})
export class AdminCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addRoleOption((option) =>
                        option //
                            .setName("role")
                            .setDescription("The role that you want Add/Remove")
                            .setRequired(false)
                    ),
            { idHints: ["1050092662486749296", "1050094587592581140"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const role = interaction.options.getRole("role") as Role | null;
        if (role) await interaction.deferReply();
        if (!role) return interaction.reply({ embeds: [await this.setdj(interaction.guildId!, undefined)] });

        interaction.followUp({ embeds: [await this.setdj(interaction.guildId!, role.id)] });
    }

    public async messageRun(message: Message, args: Args) {
        const role = await args.pick("role").catch(() => undefined);
        if (!role && args.finished) return send(message, { embeds: [await this.setdj(message.guildId!, undefined)] });
        if (!role) return send(message, { embeds: [{ description: `Role not found.`, color: embedColor.error }] });

        send(message, { embeds: [await this.setdj(message.guildId!, role.id)] });
    }

    private async setdj(guildId: string, roleId?: string) {
        const { db } = this.container;
        const data = await db.guilds.findUnique({ where: { id: guildId } });
        if (!data) return new MessageEmbed().setDescription(`There is no DJ role set.`).setColor(embedColor.warn);

        const dj = data.dj.map((id) => `<@&${id}>`);
        if (!roleId && isNullishOrEmpty(dj))
            return new MessageEmbed().setDescription(`There is no DJ role set.`).setColor(embedColor.warn);
        if (!roleId)
            return new MessageEmbed()
                .setFields([{ name: `Configured DJ role:`, value: `${zws}\n${dj.join("\n")}` }])
                .setColor(embedColor.default);

        const idAdded = data.dj.includes(roleId) ? false : true;
        const roles = data.dj.includes(roleId) //
            ? removeItem(data.dj, roleId)
            : [...data.dj, roleId];

        await db.guilds.upsert({
            where: { id: guildId },
            update: { dj: { set: roles } },
            create: { id: guildId, dj: { set: roles } },
        });

        return new MessageEmbed()
            .setDescription(idAdded ? `Added <@&${roleId}> to the DJ roles` : `Removed <@&${roleId}> from the DJ roles.`)
            .setColor(embedColor.default);
    }
}
