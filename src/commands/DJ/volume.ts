import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { sendLoadingMessage } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: "Lets you change the bots output volume.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["v", "vol"],
    detailedDescription: {
        usages: [";1-200"],
    },
})
export class VolumeCommand extends KoosCommand {
    public override async registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .addNumberOption((option) =>
                    option.setName("input").setDescription("Lets you change the bots output volume.").setMinValue(0).setMaxValue(200)
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);
        const input = interaction.options.getNumber("input");

        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        if (input && (input > 200 || input < 1))
            return interaction.reply({
                embeds: [
                    new EmbedBuilder().setDescription(`The volume may not be less than 0 or more than 200`).setColor(KoosColor.Error),
                ],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [await this.volume(player, input)] });
    }

    public async messageRun(message: Message, args: Args) {
        await sendLoadingMessage(message);
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);
        const input = await args.pick("number").catch(() => undefined);

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }
        if (input && (input > 200 || input < 1))
            return send(message, {
                embeds: [
                    new EmbedBuilder().setDescription(`The volume may not be less than 0 or more than 200`).setColor(KoosColor.Error),
                ],
            });

        send(message, { embeds: [await this.volume(player, input)] });
    }

    private async volume(player: KazagumoPlayer, input?: number | null) {
        const { db } = this.container;

        if (isNullish(input) || typeof input === "undefined") {
            let volume = player.volume * 100;
            return new EmbedBuilder().setDescription(`Current volume is \`${volume}%\``).setColor(KoosColor.Default);
        }

        player.setVolume(input);
        await db.guild.update({ where: { id: player.guildId }, data: { volume: input } });
        return new EmbedBuilder().setDescription(`Changed the volume to \`${player.volume * 100}%\``).setColor(KoosColor.Default);
    }
}
