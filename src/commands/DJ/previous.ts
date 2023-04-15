import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { KazagumoPlayer, KazagumoTrack, RawTrack } from "kazagumo";
import { Message, EmbedBuilder, GuildMember } from "discord.js";
import { KoosColor } from "#utils/constants";
import { reply } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";

@ApplyOptions<KoosCommand.Options>({
    description: "Goes back to the first track in listening history",
    aliases: ["prev", "back"],
})
export class PreviousCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription("There's nothing playing in this server").setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        }

        const queue = player.data.get("queue") as RawTrack[];
        const currentTrack = player.data.get("currentTrack") as RawTrack;

        const currentIndex = queue.findIndex((rawTrack) => rawTrack.info.identifier === currentTrack.info.identifier);
        const previousTrack = queue[currentIndex - 1];

        if (isNullish(previousTrack))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There are no previous tracks`).setColor(KoosColor.Error)],
                ephemeral: true,
            });

        this.previous(player, previousTrack, interaction.member as GuildMember);

        interaction.reply({
            embeds: [new EmbedBuilder().setDescription(`Playing the previous track`).setColor(KoosColor.Default)],
            ephemeral: true,
        });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: KoosColor.Warn }],
            });
        }

        const queue = player.data.get("queue") as RawTrack[];
        const currentTrack = player.data.get("currentTrack") as RawTrack;

        const currentIndex = queue.findIndex((rawTrack) => rawTrack.track === currentTrack.track);
        const previousTrack = queue[currentIndex - 1];

        if (isNullish(previousTrack))
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There are no previous tracks`).setColor(KoosColor.Error)],
            });

        this.previous(player, previousTrack, message.member!);
    }

    private previous(player: KazagumoPlayer, previousTrack: RawTrack, member: GuildMember) {
        player.play(new KazagumoTrack(previousTrack, member));
    }
}
