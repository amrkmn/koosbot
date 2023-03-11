import { KoosCommand } from "#lib/extensions";
import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { Message, MessageEmbed } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: "Lets you change the bots output volume.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["v", "vol"],
    usage: {
        types: [{ type: "1-200", required: false }],
    },
})
export class UserCommand extends KoosCommand {
    public override async registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addNumberOption((option) =>
                        option
                            .setName("input")
                            .setDescription("Lets you change the bots output volume.")
                            .setMinValue(0)
                            .setMaxValue(200)
                    ),
            { idHints: ["1050662611722706945", "1050766029862752356"] }
        );
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);
        const input = await args.pick("number").catch(() => undefined);

        if (!player) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
            });
        }
        if (input && (input > 200 || input < 1))
            return send(message, {
                embeds: [{ description: `The volume may not be less than 0 or more than 200`, color: embedColor.error }],
            });

        send(message, { embeds: [await this.volume(player, input)] });
    }

    private async volume(player: KazagumoPlayer, input?: number) {
        const { db } = this.container;

        if (typeof input === "undefined") {
            let volume = player.volume * 100;
            return new MessageEmbed().setDescription(`Current volume is \`${volume}%\``).setColor(embedColor.default);
        }

        player.setVolume(input);
        await db.guild.update({ where: { id: player.guildId }, data: { volume: input } });
        return new MessageEmbed().setDescription(`Changed the volume to \`${player.volume * 100}%\``).setColor(embedColor.default);
    }
}
