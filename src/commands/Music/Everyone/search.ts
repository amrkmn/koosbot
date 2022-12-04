import { KoosCommand } from "#lib/extensions";
import { embedColor } from "#utils/constants";
import { convertTime, cutText, mins } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { Message, MessageSelectOptionData, MessageSelectMenu } from "discord.js";
import { Kazagumo } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: `Searches and lets you choose a song.`,
    usage: "song name",
})
export class UserCommand extends KoosCommand {
    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const query = await args.rest("string").catch(() => undefined);
        if (!query)
            return send(message, { embeds: [{ description: "Please provide an URL or search query", color: embedColor.error }] });

        await this.search(kazagumo, message, query);
    }

    private async search(kazagumo: Kazagumo, message: Message, query: string) {
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

        const msg = await send(message, {
            embeds: [{ description: `There are ${tracks.length} ${pluralize("result", tracks.length)}`, color: embedColor.default }],
            components: [{ type: "ACTION_ROW", components: [selectMenu] }],
        });

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
                    voiceId: `${message.member?.voice.channelId}`,
                    deaf: true,
                });

            interaction.followUp({ embeds: [{ description: `Queued ${title}`, color: embedColor.default }] });

            player.queue.add(selected);
            if (!player.playing && !player.paused) player.play();
            collector.stop("picked");
        });

        collector.on("end", (_, reason) => {
            switch (reason) {
                case "cancel":
                case "picked":
                    send(message, {
                        embeds: [
                            {
                                description: `There are ${tracks.length} ${pluralize("result", tracks.length)}`,
                                color: embedColor.default,
                            },
                        ],
                        components: [
                            {
                                type: "ACTION_ROW",
                                components: [selectMenu.setPlaceholder("You already picked a choice").setDisabled(true)],
                            },
                        ],
                    });
                    break;
                case "time":
                    send(message, {
                        embeds: [
                            {
                                description: `There are ${tracks.length} ${pluralize("result", tracks.length)}`,
                                color: embedColor.default,
                            },
                        ],
                        components: [{ type: "ACTION_ROW", components: [selectMenu.setPlaceholder("Timed out").setDisabled(true)] }],
                    });
                    break;
            }
        });
    }
}
