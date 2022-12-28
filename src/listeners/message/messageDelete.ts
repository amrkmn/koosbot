import { embedColor } from "#utils/constants";
import { convertTime } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Events } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { Message, MessageEmbed } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.MessageDelete,
})
export class ClientListener extends Listener {
    public async run(message: Message) {
        const { kazagumo, db } = this.container;

        const player = kazagumo.getPlayer(message.guildId!);
        const data = await db.guilds.findUnique({ where: { id: message.guildId! } });
        if (isNullish(player) || isNullish(data)) return;

        const npMessage = player.data.get("nowPlayingMessage");

        if (npMessage instanceof Message && message.id === npMessage.id) {
            let { embeds, components } = npMessage;

            if (isNullishOrEmpty(embeds)) {
                const track = player.queue.current!;
                let title =
                    track.sourceName == "youtube"
                        ? `[${track.title}](${track.uri})`
                        : `[${track.title} by ${track.author}](${track.uri})`;

                embeds = [
                    new MessageEmbed()
                        .setDescription(
                            [
                                `Started playing ${title} [${track.isStream ? `Live` : convertTime(Number(track.length))}]`,
                                `${data?.requester ? ` ~ ${track.requester}` : ""}`,
                            ].join("")
                        )
                        .setColor(embedColor.default),
                ];
            }

            const newNpMessage = await send(npMessage, { embeds, components });
            player.data.set("nowPlayingMessage", newNpMessage);
        }

        return;
    }
}
