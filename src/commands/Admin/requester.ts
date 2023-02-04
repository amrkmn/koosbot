import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { MessageEmbed, Message } from "discord.js";
import { embedColor } from "#utils/constants";
import { send } from "@sapphire/plugin-editable-commands";
import { Emojis, PermissionLevels } from "#lib/utils/constants";
import { Args } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";

@ApplyOptions<KoosCommand.Options>({
    description: "Enables/disables if the requester is shown on each track.",
    permissionLevels: PermissionLevels.Administrator,
    aliases: ["req"],
    usage: {
        type: ["enable", "disable"],
        required: true,
    },
})
export class UserCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addBooleanOption((option) =>
                        option //
                            .setName("enable")
                            .setDescription(this.description)
                            .setRequired(true)
                    ),
            { idHints: ["1053707175316426863", "1053707710861955163"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const enable = interaction.options.getBoolean("enable") ?? undefined;

        await interaction.deferReply();
        interaction.followUp({ embeds: [await this.requester(interaction.guildId!, enable)] });
    }

    public async messageRun(message: Message, args: Args) {
        const enable = await args.pick("enum", { enum: ["enable", "disable"] }).catch(() => undefined);
        if (isNullish(enable))
            return send(message, {
                embeds: [{ description: "Please enter an input.", color: embedColor.error }],
            });

        let input: boolean;
        if (enable === "enable") input = true;
        else input = false;

        send(message, { embeds: [await this.requester(message.guildId!, input)] });
    }

    private async requester(guildId: string, enable?: boolean) {
        const { db } = this.container;
        const data = await db.guilds.findUnique({ where: { id: guildId } });

        const { requester } = await db.guilds.upsert({
            where: { id: guildId },
            update: { requester: enable ?? !data?.requester },
            create: { id: guildId, requester: enable ?? true },
            select: { requester: true },
        });

        return new MessageEmbed()
            .setDescription(
                requester
                    ? `${Emojis.Yes} Requester will be shown permanently on each track.`
                    : `${Emojis.No} Requester is no longer shown permanently on each track.`
            )
            .setColor(requester ? embedColor.success : embedColor.error);
    }
}
