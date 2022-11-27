import { Command } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { Message } from "discord.js";

export class UserCommand extends Command {
    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return send(message, {
                embeds: [{ description: "There's nothing playing in this server" }],
            });
        }

        let current = player.queue.current!;
        let title = `[**${current.title}**](${current.uri})`;

        player.skip();

        send(message, {
            embeds: [{ description: `Skipped ${title}` }],
        });
    }
}
