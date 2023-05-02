import { envParseString } from "@skyra/env-utilities";
import { KoosCommand } from "#lib/extensions";
import { PermissionLevel } from "#lib/utils/constants";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { isNullish } from "@sapphire/utilities";
import { Message, EmbedBuilder } from "discord.js";
import { Args, ResultError } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { sendLoadingMessage } from "#utils/functions";

@ApplyOptions<KoosCommand.Options>({
    description: `Lets you set a new prefix.`,
    permissionLevels: PermissionLevel.Administrator,
    detailedDescription: {
        usages: [";newPrefix"],
    },
})
export class PrefixCommand extends KoosCommand {
    public async messageRun(message: Message, args: Args) {
        await sendLoadingMessage(message);
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
                    embeds: [new EmbedBuilder().setDescription(`Prefix must be shorter than 5 characters.`).setColor(KoosColor.Error)],
                });
        }
    }

    private async prefix(guildId: string, guildName: string, input?: string) {
        const { db } = this.container;

        if (isNullish(input)) {
            const data = await db.guild.findUnique({ where: { id: guildId } });
            let prefix = "";
            if (isNullish(data)) prefix = `${envParseString("CLIENT_PREFIX")}`;
            else if (data.prefix === "NONE") prefix = `${envParseString("CLIENT_PREFIX")}`;
            else prefix = `${data.prefix}`;

            return new EmbedBuilder()
                .setDescription(`Prefix in **${guildName}** is set to: \`${prefix}\``)
                .setColor(KoosColor.Default);
        }

        const output = await db.guild.upsert({
            where: { id: guildId },
            update: { prefix: input },
            create: { id: guildId, prefix: input },
            select: { prefix: true },
        });

        return new EmbedBuilder().setDescription(`The prefix has been changed to \`${output.prefix}\``).setColor(KoosColor.Success);
    }
}
