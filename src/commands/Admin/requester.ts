import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { MessageEmbed, Message } from "discord.js";
import { embedColor } from "#utils/constants";
import { send } from "@sapphire/plugin-editable-commands";
import { Emojis, PermissionLevels } from "#lib/types/Enums";
import { Args } from "@sapphire/framework";

@ApplyOptions<KoosCommand.Options>({
    description: "Enables/disables if the requester is shown on each track.",
    permissionLevels: PermissionLevels.Administrator,
    aliases: ["req"],
    usage: {
        type: ["true", "false"],
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
        const enable = await args.pick("boolean").catch(() => undefined);

        send(message, { embeds: [await this.requester(message.guildId!, enable)] });
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
