import { KoosCommand } from "#lib/extensions";
import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, MessageEmbed } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: `Cycles through all three loop modes (queue, song, off).`,
    preconditions: ["GuildOnly", "VoiceOnly", "DJ"],
    usage: {
        type: ["off", "queue", "song"],
        required: false,
    },
})
export class UserCommand extends KoosCommand {
    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const mode = await args.pick("enum", { enum: ["off", "queue", "song"], caseInsensitive: true }).catch(() => undefined);

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
            });
        }

        send(message, { embeds: [await this.loop(player, mode as "off" | "queue" | "song" | undefined)] });
    }

    private async loop(player: KazagumoPlayer, type?: "off" | "queue" | "song") {
        if (!type) {
            player.setLoop();
            switch (player.loop) {
                case "none":
                    return new MessageEmbed({ description: "Looping the queue activated.", color: embedColor.default });
                case "queue":
                    return new MessageEmbed({ description: "Looping the current song enabled.", color: embedColor.default });
                case "track":
                    return new MessageEmbed({ description: "Looping disabled.", color: embedColor.default });
            }
        } else {
            switch (type) {
                case "song":
                    if (player.loop === "track") {
                        player.setLoop("none");
                        return new MessageEmbed({ description: "Looping disabled.", color: embedColor.default });
                    }
                    player.setLoop("track");
                    return new MessageEmbed({ description: "Looping the current song enabled.", color: embedColor.default });
                case "queue":
                    if (player.loop === "queue") {
                        player.setLoop("none");
                        return new MessageEmbed({ description: "Looping disabled.", color: embedColor.default });
                    }
                    player.setLoop("queue");
                    return new MessageEmbed({ description: "Looping the queue activated.", color: embedColor.default });
                case "off":
                    if (player.loop === "none") {
                        return new MessageEmbed({ description: "Looping is already set to off.", color: embedColor.default });
                    }
                    player.setLoop("none");
                    return new MessageEmbed({ description: "Looping disabled.", color: embedColor.default });
            }
        }
    }
}