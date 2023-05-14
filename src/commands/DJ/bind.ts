import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { ChannelType, EmbedBuilder, Message, TextBasedChannel } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: `Bind the dashboard to current channel`,
})
export class BindCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addChannelOption((option) =>
                    option //
                        .setName("channel")
                        .setDescription("The channel to bind")
                        .addChannelTypes(ChannelType.GuildText)
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);
        const channel = (interaction.options.getChannel("channel") ?? interaction.channel ?? null) as TextBasedChannel | null;

        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        if (isNullish(channel))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`Cannot find the provided channel`).setColor(KoosColor.Error)],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [this.bind(player, channel)] });
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const channel = await args.pick("channel").catch(() => message.channel ?? null);

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }
        if (isNullish(channel) || !channel.isTextBased())
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`Cannot find the provided channel`).setColor(KoosColor.Error)],
            });

        send(message, { embeds: [this.bind(player, channel)] });
    }

    private bind(player: KazagumoPlayer, channel: TextBasedChannel) {
        player.setTextChannel(channel.id);
        return new EmbedBuilder().setDescription(`The dashboard has been bound to ${channel}`).setColor(KoosColor.Default);
    }
}
