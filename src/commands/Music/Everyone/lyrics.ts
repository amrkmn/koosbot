import { envParseString } from "#env";
import { KoosCommand } from "#lib/extensions";
import { embedColor } from "#utils/constants";
import { cutText } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, MessageEmbed, MessageSelectOptionData, MessageActionRow, MessageSelectMenu } from "discord.js";
import { Client as GeniusClient } from "genius-lyrics";

@ApplyOptions<KoosCommand.Options>({
    description: "Get the lyrics of a song",
})
export class UserCommand extends KoosCommand {
    genius = new GeniusClient(envParseString("GENIUS_TOKEN"));

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const query = await args.rest("string").catch(() => {
            if (!player || (player && !player.queue.current)) {
                return undefined;
            }
            return `${player.queue.current?.title}`;
        });

        const lyrics = await this.lyrics(message, query);

        send(message, { embeds: [lyrics.embed], components: lyrics.row ? [lyrics.row] : undefined });
    }

    private async lyrics(message: Message | KoosCommand.ChatInputInteraction, query?: string) {
        if (!query) return { embed: new MessageEmbed().setDescription("Please provide a song title").setColor(embedColor.error) };
        let result = await this.genius.songs.search(query);

        result = result.slice(0, 10);

        const options: MessageSelectOptionData[] = [];

        for (let i = 0; i < result.length; i++) {
            const song = result[i];
            options.push({
                label: cutText(`${i + 1}. ${song.fullTitle}`, 100),
                value: `${song.id}`,
            });
        }

        const selectMenu = new MessageSelectMenu().setCustomId("lyricsOptions").setOptions(options).setPlaceholder("Make a selection");
        const row = new MessageActionRow().setComponents(selectMenu);

        const description: string[] = [];

        let i = 0;
        for (let { fullTitle, url } of result) {
            description.push(`**${i++ + 1}.** [${fullTitle}](${url})`);
        }
        return {
            embed: new MessageEmbed().setDescription(description.join("\n")).setColor(embedColor.default),
            row,
        };
    }
}
