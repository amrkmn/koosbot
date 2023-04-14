import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { EmbedBuilder, Message, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { KoosColor } from "#utils/constants";
import { send } from "@sapphire/plugin-editable-commands";
import { Emoji, PermissionLevel } from "#lib/utils/constants";
import { Args } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { sendLoadingMessage } from "#utils/functions";

@ApplyOptions<KoosCommand.Options>({
    description: "Enables/disables if the requester is shown on each track.",
    permissionLevels: PermissionLevel.Administrator,
    aliases: ["req"],
    usage: {
        type: ["enable", "disable"],
        required: true,
    },
})
export class RequesterCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .addBooleanOption((option) =>
                    option //
                        .setName("enable")
                        .setDescription(this.description)
                        .setRequired(true)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const enable = interaction.options.getBoolean("enable")!;

        await interaction.deferReply();
        interaction.followUp({ embeds: [await this.requester(interaction.guildId!, enable)] });
    }

    public async messageRun(message: Message, args: Args) {
        await sendLoadingMessage(message);
        const options = ["enable", "disable", "true", "false"];
        const input = await args.pick("enum", { enum: options, caseInsensitive: true }).catch((e) => {
            let identifier = `${Reflect.get(e.value, "identifier")}`;
            return identifier === "argsMissing" ? undefined : identifier;
        });
        if (isNullish(input))
            return send(message, {
                embeds: [{ description: "Please enter an input.", color: KoosColor.Error }],
            });
        if (input === "enumError")
            return send(message, {
                embeds: [{ description: `Please enter a correct input. (${options.join(", ")})`, color: KoosColor.Error }],
            });

        let enable: boolean;
        if (["enable", "true"].includes(input.toLowerCase())) enable = true;
        else enable = false;

        send(message, { embeds: [await this.requester(message.guildId!, enable)] });
    }

    private async requester(guildId: string, enable: boolean) {
        const { db } = this.container;

        const { requester } = await db.guild.upsert({
            where: { id: guildId },
            update: { requester: enable },
            create: { id: guildId, requester: enable },
            select: { requester: true },
        });

        return new EmbedBuilder()
            .setDescription(
                requester
                    ? `${Emoji.Yes} Requester will be shown permanently on each track.`
                    : `${Emoji.No} Requester is no longer shown permanently on each track.`
            )
            .setColor(requester ? KoosColor.Success : KoosColor.Error);
    }
}
