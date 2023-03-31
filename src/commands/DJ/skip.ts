import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: "Skip to the next track or to a specific track in the queue.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["n", "next"],
    usage: {
        types: [{ type: "to" }],
    },
})
export class SkipCommand extends KoosCommand {
    public votes = new Set<string>();

    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addNumberOption((option) =>
                        option //
                            .setName("to")
                            .setDescription("Skips to a specific track in the queue.")
                    ),
            { idHints: ["1050092756636274778", "1050094681654055064"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const to = interaction.options.getNumber("to") ?? undefined;
        const player = kazagumo.getPlayer(interaction.guildId!)!;

        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: KoosColor.Warn }],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [await this.skip(player, to)] });
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const to = await args.pick("number").catch(() => undefined);
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: KoosColor.Warn }],
            });
        }

        send(message, { embeds: [await this.skip(player, to)] });
    }

    private async skip(player: KazagumoPlayer, amount?: number) {
        let embed: EmbedBuilder;
        if (typeof amount === "number" && amount > 1) {
            if (amount > player.queue.length)
                return new EmbedBuilder().setDescription("Cannot skip more than the queue length.").setColor(KoosColor.Error);
            player.queue.splice(0, amount - 1);
            embed = new EmbedBuilder().setDescription(`Skipped ${amount} ${pluralize("song", amount)}`).setColor(KoosColor.Success);
        } else {
            const current = player.queue.current!;
            const title =
                current.sourceName === "youtube"
                    ? `[${current.title}](${current.uri})`
                    : `[${current.title} by ${current.author ?? "Unknown artist"}](${current.uri})`;

            embed = new EmbedBuilder() //
                .setDescription(`${title} has been skipped`)
                .setColor(KoosColor.Success);
        }

        player.skip();
        return embed;
    }
}
