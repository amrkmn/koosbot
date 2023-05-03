import { KoosCommand } from "#lib/extensions";
import { PermissionLevel } from "#lib/utils/constants";
import { KoosColor } from "#utils/constants";
import { sendLoadingMessage } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args, UserError } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { envParseString } from "@skyra/env-utilities";
import { EmbedBuilder, Message } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: `Lets you set a new prefix.`,
    permissionLevels: PermissionLevel.Administrator,
    detailedDescription: {
        usages: [";new"],
    },
})
export class PrefixCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option //
                        .setName("new")
                        .setDescription("The new prefix")
                        .setMinLength(1)
                        .setMaxLength(5)
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const prefix = interaction.options.getString("new") ?? undefined;

        console.log(prefix);

        await interaction.deferReply();

        if (isNullish(prefix))
            return interaction.followUp({
                embeds: [await this.prefix(interaction.guildId!, interaction.guild!.name, prefix)],
            });

        return interaction.followUp({
            embeds: [await this.prefix(interaction.guildId!, interaction.guild!.name, prefix)],
        });
    }

    public async messageRun(message: Message, args: Args) {
        await sendLoadingMessage(message);
        try {
            const input = await args.pick("string", { minimum: 1, maximum: 5 });

            send(message, { embeds: [await this.prefix(message.guildId!, message.guild!.name, input)] });
        } catch (error) {
            if (error instanceof UserError && error.identifier === "argsMissing")
                return send(message, {
                    embeds: [await this.prefix(message.guildId!, message.guild!.name, undefined)],
                });
            else if (error instanceof UserError && error.identifier === "stringTooLong")
                return send(message, {
                    embeds: [new EmbedBuilder().setDescription(`Prefix must be shorter than 5 characters.`).setColor(KoosColor.Error)],
                });
        }
    }

    private async prefix(guildId: string, guildName: string, input?: string) {
        const { db } = this.container;

        if (isNullish(input)) {
            const data = await db.guild.findUnique({ where: { id: guildId } });
            let prefix = "";
            if (isNullish(data)) prefix = `${envParseString("CLIENT_PREFIX")}`;
            else if (data.prefix === "NONE") prefix = `${envParseString("CLIENT_PREFIX")}`;
            else prefix = `${data.prefix}`;

            return new EmbedBuilder()
                .setDescription(`Prefix in **${guildName}** is set to: \`${prefix}\``)
                .setColor(KoosColor.Default);
        }

        const output = await db.guild.upsert({
            where: { id: guildId },
            update: { prefix: input },
            create: { id: guildId, prefix: input },
            select: { prefix: true },
        });

        return new EmbedBuilder().setDescription(`The prefix has been changed to \`${output.prefix}\``).setColor(KoosColor.Success);
    }
}
