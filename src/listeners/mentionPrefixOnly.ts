import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import type { Message } from "discord.js";

@ApplyOptions<Listener.Options>({ name: Events.MentionPrefixOnly })
export class UserListener extends Listener {
    public async run(message: Message) {
        const prefix = await this.container.client.fetchPrefix(message);
        return send(message, {
            embeds: [
                {
                    description: prefix ? `My prefix in this guild is: \`${prefix}\`` : "You do not need a prefix in DMs.",
                    color: embedColor.default,
                },
            ],
        });
    }
}
