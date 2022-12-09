import { KoosCommand } from "#lib/extensions";
import { PermissionLevels } from "#lib/types/Enums";
import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { Message, MessageEmbed } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Lets you change the bots default output volume.",
    aliases: ["setvol"],
    permissionLevels: PermissionLevels.Administrator,
    usage: "1-200",
})
export class AdminCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addNumberOption((option) =>
                        option.setName("input").setDescription("The new volume.").setMinValue(0).setMaxValue(200)
                    ),
            { idHints: ["1050765774828077151", "1050766022451417118"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const input = interaction.options.getNumber("input") ?? undefined;

        await interaction.deferReply();
        interaction.followUp({ embeds: [await this.setVolume(interaction.guildId!, input)] });
    }

    public async messageRun(message: Message, args: Args) {
        const input = await args.pick("number").catch(() => undefined);

        if (input && (input > 200 || input < 1))
            return send(message, {
                embeds: [{ description: `The volume may not be less than 0 or more than 200`, color: embedColor.error }],
            });

        send(message, { embeds: [await this.setVolume(message.guildId!, input)] });
    }

    private async setVolume(guildId: string, input?: number) {
        const { db } = this.container;
        const data = await db.guild.findUnique({ where: { id: guildId } });

        if (typeof input === "undefined") {
            let volume = 0;
            if (isNullish(data)) volume = 100;
            else volume = data.volume;
            return new MessageEmbed().setDescription(`Current default volume is \`${volume}%\``).setColor(embedColor.default);
        }

        await db.guild.update({ where: { id: guildId }, data: { volume: input } });
        return new MessageEmbed().setDescription(`Changed the default volume to \`${input}%\``).setColor(embedColor.default);
    }
}
