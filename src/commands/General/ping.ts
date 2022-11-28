import { ApplyOptions } from "@sapphire/decorators";
import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import type { Message } from "discord.js";

@ApplyOptions<Command.Options>({
    description: "Get the bot's latency",
})
export class UserCommand extends Command {
    public override registerApplicationCommands(registery: Command.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1046619922538692748"] }
        );
    }

    public async chatInputRun(interaction: Command.ChatInputInteraction) {
        await interaction.deferReply();
        const msg = (await interaction.followUp({ content: "Ping?" })) as Message;

        if (isMessageInstance(msg)) {
            const diff = msg.createdTimestamp - interaction.createdTimestamp;
            const ping = Math.round(this.container.client.ws.ping);
            const content = `Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`;

            interaction.editReply({ content });
        }
    }

    public async messageRun(message: Message) {
        const msg = await send(message, "Ping?");

        const diff = msg.createdTimestamp - message.createdTimestamp;
        const ping = Math.round(this.container.client.ws.ping);
        const content = `Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`;

        return send(message, { content });
    }
}
