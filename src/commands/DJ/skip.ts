import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { EmbedBuilder, Message } from "discord.js";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: "Skip to the next track or to a specific track in the queue.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["n", "next"],
    detailedDescription: {
        usage: [";to"],
    },
})
export class SkipCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .addNumberOption((option) =>
                    option //
                        .setName("to")
                        .setDescription("Skips to a specific track in the queue.")
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { manager } = this.container;
        const player = manager.players.get(interaction.guildId!)!;
        const to = interaction.options.getNumber("to") ?? undefined;

        if (!player || !player.current)
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [await this.skip(player, to)] });
    }

    public async messageRun(message: Message, args: Args) {
        const { manager } = this.container;
        const player = manager.players.get(message.guildId!)!;
        const to = await args.pick("number").catch(() => undefined);

        if (!player || !player.current) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [await this.skip(player, to)] });
    }

    private async skip(player: Player, to?: number) {
        if (typeof to === "number" && to > 1) {
            if (to > player.queue.size)
                return new EmbedBuilder().setDescription("Cannot skip more than the queue length.").setColor(KoosColor.Error);
            const skipped = player.queue.splice(0, to);
            const firstTrack = player.queue.shift();

            player.history.push(player.current!);
            skipped.forEach((track) => player.history.push(track));

            player.play(firstTrack, { replaceCurrent: true });

            return new EmbedBuilder().setDescription(`Skipped ${to} ${pluralize("song", to)}`).setColor(KoosColor.Success);
        } else {
            const current = player.current!;
            const title = createTitle(current);

            player.skip();

            return new EmbedBuilder() //
                .setDescription(`${title} has been skipped`)
                .setColor(KoosColor.Success);
        }
    }
}
