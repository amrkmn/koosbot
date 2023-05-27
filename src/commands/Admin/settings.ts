import { KoosCommand } from "#lib/extensions";
import { ButtonId, KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { send } from "@sapphire/plugin-editable-commands";
import { stripIndents } from "common-tags";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message, type Guild, type GuildMember } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Set the settings for the bot.",
})
export class SettingsCommand extends KoosCommand {
    public async messageRun(message: Message) {
        const { embed, rows } = this.settings(message.member!, message.guild!);

        send(message, { embeds: [embed], components: [...rows] });
    }

    private settings(member: GuildMember, guild: Guild) {
        const { client } = this.container;

        const homeMessage = stripIndents`
            Hey, ${member}

            Click the buttons below to select what type of settings that you want to set.
        `;
        const homeEmbed = new EmbedBuilder()
            .setAuthor({ name: `${client.user?.tag}`, iconURL: client.user?.displayAvatarURL() })
            .setDescription(homeMessage)
            .setColor(KoosColor.Default)
            .setTimestamp();
        const homeRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
            new ButtonBuilder()
                .setCustomId(`${guild.id};${ButtonId.PlayerSetting}`)
                .setLabel("Player settings")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`${guild.id};${ButtonId.DJSetting}`)
                .setLabel("DJ settings")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`${guild.id};${ButtonId.SongRequestChannelSetting}`)
                .setLabel("Song Request settings")
                .setStyle(ButtonStyle.Secondary),
        ]);
        const backRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder().setCustomId(`${guild.id};${ButtonId.Back}`)
        );

        return { embed: homeEmbed, rows: [homeRow, backRow] };
    }
}
