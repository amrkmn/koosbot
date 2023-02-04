import { envParseString } from "@skyra/env-utilities";
import { KoosCommand } from "#lib/extensions";
import { PermissionLevels } from "#lib/utils/constants";
import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { isNullish } from "@sapphire/utilities";
import { Message, MessageEmbed } from "discord.js";
import { Args, ResultError } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";

@ApplyOptions<KoosCommand.Options>({
    description: `Lets you set a new prefix.`,
    permissionLevels: PermissionLevels.Administrator,
    usage: {
        types: [{ type: "new prefix", required: false }],
    },
})
export class AdminCommadn extends KoosCommand {
    public async messageRun(message: Message, args: Args) {
        try {
            const input = await args.pick("string", { minimum: 1, maximum: 5 });

            send(message, { embeds: [await this.prefix(message.guildId!, message.guild!.name, input)] });
        } catch (error) {
            if (error instanceof ResultError && error.value.identifier === "argsMissing")
                return send(message, {
                    embeds: [await this.prefix(message.guildId!, message.guild!.name, undefined)],
                });
            else if (error instanceof ResultError && error.value.identifier === "stringTooLong")
                return send(message, {
                    embeds: [{ description: "Prefix must be shorter than 5 characters.", color: embedColor.error }],
                });
        }
    }

    private async prefix(guildId: string, guildName: string, input?: string) {
        const { db } = this.container;
        const data = await db.guilds.findUnique({ where: { id: guildId } });

        if (isNullish(input)) {
            let prefix = "";
            if (isNullish(data)) prefix = `${envParseString("CLIENT_PREFIX")}`;
            else if (data.prefix === "NONE") prefix = `${envParseString("CLIENT_PREFIX")}`;
            else prefix = `${data.prefix}`;

            return new MessageEmbed()
                .setDescription(`Prefix in **${guildName}** is set to: \`${prefix}\``)
                .setColor(embedColor.default);
        }

        const output = await db.guilds.upsert({
            where: { id: guildId },
            update: { prefix: input },
            create: { id: guildId, prefix: input },
            select: { prefix: true },
        });

        return new MessageEmbed().setDescription(`The prefix has been changed to \`${output.prefix}\``).setColor(embedColor.success);
    }
}
