import { KoosColor } from "#utils/constants";
import { convertTime, createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Events } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { oneLine } from "common-tags";
import { Message, EmbedBuilder } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.MessageDelete,
})
export class ClientListener extends Listener {
    public async run(message: Message) {
        const { kazagumo, db } = this.container;

        const player = kazagumo.getPlayer(message.guildId!);
        const data = await db.guild.findUnique({ where: { id: message.guildId! } });
        if (isNullish(player) || isNullish(data)) return;

        const npMessage = player.nowPlaying();

        if (npMessage instanceof Message && message.id === npMessage.id) {
            let { embeds, components } = npMessage;
            let newEmbeds: EmbedBuilder[] = [];

            if (isNullishOrEmpty(embeds)) {
                const track = player.queue.current!;
                let title = createTitle(track);

                newEmbeds.push(
                    new EmbedBuilder()
                        .setDescription(
                            oneLine`
                                ${title} [${track.isStream ? `Live` : convertTime(Number(track.length))}]
                                ${data?.requester ? ` ~ ${track.requester}` : ""}
                            `
                        )
                        .setColor(KoosColor.Default)
                );
            }

            const newNpMessage = await send(npMessage, { components, embeds: isNullishOrEmpty(newEmbeds) ? embeds : newEmbeds });
            player.nowPlaying(newNpMessage);
        }

        return;
    }
}
