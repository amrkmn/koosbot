import { Args, Command } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { Message } from "discord.js";
import { send } from "@sapphire/plugin-editable-commands";
import { KazagumoTrack } from "kazagumo";
import { embedColor, regex } from "#utils/constants";
import pluralize from "pluralize";

@ApplyOptions<Command.Options>({
    description: "Add a track to queue.",
    aliases: ["p"],
    preconditions: ["GuildOnly", "VoiceOnly"],
})
export class UserCommand extends Command {
    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const query = await args.rest("string").catch(() => undefined);
        if (!query)
            return send(message, { embeds: [{ description: "Please provide an URL or search query", color: embedColor.red }] });

        const channel = message.member?.voice.channel;
        let player = kazagumo.getPlayer(message.guildId!);

        const result = await kazagumo.search(query, { requester: message.author });
        if (!result.tracks.length)
            return send(message, {
                embeds: [{ description: `Something went wrong`, color: embedColor.red }],
            });

        let tracks: KazagumoTrack[] = [],
            msg: string = "";
        switch (result.type) {
            case "PLAYLIST":
                for (let track of result.tracks) tracks.push(track);
                msg = `Queued playlist [${result.playlistName}](${query}) with ${tracks.length} ${pluralize("track", tracks.length)}`;
                break;
            case "SEARCH":
            case "TRACK":
                let [track] = result.tracks;
                let title = regex.youtube.test(track.uri)
                    ? `[${track.title}](${track.uri})`
                    : `[${track.title} by ${track.author}](${track.uri})`;

                tracks.push(track);
                msg = `Queued ${title}`;
                break;
        }

        if (!player) {
            player ??= await kazagumo.createPlayer({
                guildId: message.guildId!,
                textId: message.channelId!,
                voiceId: channel!.id,
                deaf: true,
            });
        }

        player.queue.add(tracks);
        if (!player.playing && !player.paused) player.play();

        send(message, { embeds: [{ description: msg, color: embedColor.default }] });
    }
}
