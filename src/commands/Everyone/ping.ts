import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { databasePing } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { send } from "@sapphire/plugin-editable-commands";
import type { Message } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Get the bot's latency.",
})
export class PingCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1050092664218984509", "1050094589731684433"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        await interaction.deferReply();
        const [msg, database] = await Promise.all([
            (await interaction.followUp({ embeds: [{ description: "Ping?", color: KoosColor.Default }] })) as Message,
            databasePing(),
        ]);

        if (isMessageInstance(msg)) {
            const diff = msg.createdTimestamp - interaction.createdTimestamp;
            const ping = Math.round(this.container.client.ws.ping);
            const content = `Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms. Database: ${Math.round(database)}ms.)`;

            interaction.editReply({ embeds: [{ description: content, color: KoosColor.Default }] });
        }
    }

    public async messageRun(message: Message) {
        const [msg, database] = await Promise.all([
            send(message, { embeds: [{ description: "Ping?", color: KoosColor.Default }] }),
            databasePing(),
        ]);

        const diff = msg.createdTimestamp - message.createdTimestamp;
        const ping = Math.round(this.container.client.ws.ping);
        const content = `Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms. Database: ${Math.round(database)}ms.)`;

        return send(message, { embeds: [{ description: content, color: KoosColor.Default }] });
    }
}
