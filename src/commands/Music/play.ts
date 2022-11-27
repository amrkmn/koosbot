import { Args, Command } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { Message } from "discord.js";
import { send } from "@sapphire/plugin-editable-commands";
import { KazagumoTrack } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<Command.Options>({
    description: "Add a track to queue.",
    aliases: ["p"],
})
export class UserCommand extends Command {
    // private regex = {
    //     youtube: /(youtu\.be\/|youtube\.com\/)/im,
    //     urls: /^https?:\/\//g,
    // };

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const query = await args.rest("string").catch(() => undefined);
        if (!query) return send(message, "Please provide an URL or search query");

        const vc = message.member?.voice.channel;
        let player = kazagumo.getPlayer(message.guildId!);

        const result = await kazagumo.search(query, { requester: message.author });
        if (!result.tracks.length) return send(message, { content: `uh oh something went wrong` });

        let tracks: KazagumoTrack[] = [],
            msg: string = "";
        switch (result.type) {
            case "PLAYLIST":
                for (let track of result.tracks) tracks.push(track);
                msg = `[**${result.playlistName}**](${query}) with ${tracks.length} ${pluralize("track", tracks.length)}`;
                break;
            case "SEARCH":
            case "TRACK":
                let [track] = result.tracks;
                tracks.push(track);
                msg = `Queued [**${track.title}**](${track.uri})`;
                break;
        }

        if (!player) {
            player ??= await kazagumo.createPlayer({
                guildId: message.guildId!,
                textId: message.channelId!,
                voiceId: vc!.id,
                deaf: true,
            });
        }
        player.queue.add(tracks);
        if (!player.playing && !player.paused) player.play();

        send(message, { embeds: [{ description: msg }] });
    }
}
