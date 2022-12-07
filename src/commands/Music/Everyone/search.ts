import { KoosCommand } from "#lib/extensions";
import { embedColor } from "#utils/constants";
import { convertTime, cutText, mins } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import {
    Message,
    MessageSelectOptionData,
    MessageSelectMenu,
    CommandInteraction,
    MessageEmbed,
    MessageActionRow,
    GuildMember,
} from "discord.js";
import { Kazagumo } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: `Searches and lets you choose a song.`,
    preconditions: ["GuildOnly", "VoiceOnly"],
    usage: "song name",
})
export class UserCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addStringOption((option) =>
                        option //
                            .setName("query")
                            .setDescription("The url or search term of track you want to play")
                            .setRequired(true)
                    ),
            { idHints: ["1049256604865937458"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const { kazagumo } = this.container;
        const query = interaction.options.getString("query");

        if (!query)
            return interaction.reply({
                embeds: [{ description: "Please provide an URL or search query", color: embedColor.error }],
                ephemeral: true,
            });

        await this.search(kazagumo, interaction, query);
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const query = await args.rest("string").catch(() => undefined);
        if (!query)
            return send(message, { embeds: [{ description: "Please provide an URL or search query", color: embedColor.error }] });

        await this.search(kazagumo, message, query);
    }

    private async search(kazagumo: Kazagumo, message: Message | KoosCommand.ChatInputInteraction, query: string) {
        if (message instanceof CommandInteraction && !message.deferred) await message.deferReply();
        const member = message.member as GuildMember;

        let { tracks } = await kazagumo.search(query, { requester: message.member });

        tracks = tracks.slice(0, 15);

        let options: MessageSelectOptionData[] = [];
        let i = 0;
        for (let track of tracks) {
            options.push({
                label: cutText(`${track.title}`, 100),
                description: `Duration: ${convertTime(track.length!)} | Author: ${track.author}`,
                value: `${i++}`,
            });
        }
        options.push({ label: "Cancel", description: "Cancels this search", value: `cancel` });

        const selectMenu = new MessageSelectMenu().setCustomId("searchSongs").setOptions(options).setPlaceholder("Pick a track");

        const embed = new MessageEmbed()
            .setDescription(`There are ${tracks.length} ${pluralize("result", tracks.length)}`)
            .setColor(embedColor.default);
        const row = new MessageActionRow().setComponents(selectMenu);
        const msg =
            message instanceof CommandInteraction
                ? ((await message.followUp({ embeds: [embed], components: [row] })) as Message)
                : await send(message, { embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            time: mins(1),
            componentType: "SELECT_MENU",
            filter: (i) => i.user.id === message.member?.user.id,
        });

        collector.on("collect", async (interaction) => {
            if (!interaction.isSelectMenu() || interaction.customId !== "searchSongs") return;
            await interaction.deferUpdate();

            let player = kazagumo.getPlayer(`${message.guildId}`);

            const userOption = Number(interaction.values.at(0));
            if (isNaN(userOption) && interaction.values.at(0) === "cancel") {
                interaction.followUp({ embeds: [{ description: `Canceled the search`, color: embedColor.default }] });
                collector.stop("cancel");
                return;
            }

            const selected = tracks[userOption];
            const title =
                selected.sourceName === "youtube"
                    ? `[${selected.title}](${selected.uri})`
                    : `[${selected.title} by ${selected.author}](${selected.uri})`;

            if (!player)
                player = await kazagumo.createPlayer({
                    guildId: `${message.guildId}`,
                    textId: `${message.channelId}`,
                    voiceId: `${member.voice.channelId}`,
                    deaf: true,
                });

            interaction.followUp({ embeds: [{ description: `Queued ${title} at position #${Number(player?.queue.totalSize ?? 0)}`, color: embedColor.default }] });

            player.queue.add(selected);
            if (!player.playing && !player.paused) player.play();
            collector.stop("picked");
        });

        collector.on("end", (_, reason) => {
            switch (reason) {
                case "cancel":
                case "picked":
                    let pickedRow = new MessageActionRow().setComponents(
                        selectMenu.setPlaceholder("You already picked a choice").setDisabled(true)
                    );
                    msg.edit({ embeds: [embed], components: [pickedRow] });
                    break;
                case "time":
                    let timedOutRow = new MessageActionRow().setComponents(selectMenu.setPlaceholder("Timed out").setDisabled(true));
                    msg.edit({ embeds: [embed], components: [timedOutRow] });
                    break;
            }
        });
    }
}
