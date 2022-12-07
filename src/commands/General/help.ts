import { KoosCommand } from "#lib/extensions";
import { PermissionLevels } from "#lib/types/Enums";
import { embedColor } from "#utils/constants";
import { isString } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args, SapphirePrefix } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { Collection, Message } from "discord.js";

const categoryLevel: { [key: string]: number } = {
    Admin: PermissionLevels.Administrator,
    DJ: PermissionLevels.DJ,
    Everyone: PermissionLevels.Everyone,
    General: PermissionLevels.Everyone,
};

@ApplyOptions<KoosCommand.Options>({
    description: `Lists all the commands`,
    aliases: ["h", "cmds", "cmd"],
})
export class UserCommand extends KoosCommand {
    public async messageRun(message: Message, args: Args) {
        const prefix = await this.client.fetchPrefix(message);
        const command = await args.pickResult("commandName");

        if (command.ok().isSome() === true) {
            const commandSuccess = command.unwrap();
            if (commandSuccess.hidden) return;

            const buildedCommand = await this.buildCommand(commandSuccess);
            const aliases = buildedCommand.aliases && buildedCommand.aliases.length ? buildedCommand.aliases.join("`, `") : undefined;

            const usage = this.parseUsage(commandSuccess, prefix);

            return send(message, {
                embeds: [
                    {
                        description: aliases ? `Aliases: \`${aliases}\`` : undefined,
                        fields: [{ name: `${usage}`, value: `${buildedCommand.description}\n\`[${buildedCommand.category}]\`` }],
                        author: { name: `Help command: ${buildedCommand.name}`, iconURL: this.client.user?.displayAvatarURL() },
                        color: embedColor.default,
                    },
                ],
            });
        } else if (
            command.err().isSome() &&
            (command.err().unwrap().identifier === "commandNotFound" || command.err().unwrap().identifier === "commandCannotResolve")
        )
            return send(message, {
                embeds: [{ description: `${command.err().unwrap().message}`, color: embedColor.error }],
            });

        const help = await this.buildHelp(message);

        send(message, {
            embeds: [
                {
                    fields: help,
                    color: embedColor.default,
                    footer: { text: `Use ${prefix}help [command] to get more information about a command` },
                    author: { name: `${this.client.user?.username}'s Command List`, iconURL: this.client.user?.displayAvatarURL() },
                },
            ],
        });
    }

    private async buildCommand(command: KoosCommand) {
        const name = command.name;
        const description = command.description || "No description provided";
        const aliases = command.aliases || [];
        const category = `${command.fullCategory.at(-1) ?? command.category}`;

        return { name, description, aliases, category };
    }

    private parseUsage(command: KoosCommand, prefix: SapphirePrefix) {
        const types = command.usage?.arrayOfTypes;
        const parsedTypes = types?.map(({ type, required }) => {
            let brackets = required ? `<>` : `[]`;
            return isString(type) || Array.isArray(type)
                ? Array.isArray(type)
                    ? `${brackets[0]}${type.join(" | ")}${brackets[1]}`
                    : `${brackets[0]}${type}${brackets[1]}`
                : ``;
        });
        let brackets = command.usage?.required ? `<>` : `[]`;
        let text =
            isString(command.usage?.type) || Array.isArray(command.usage?.type)
                ? Array.isArray(command.usage?.type)
                    ? `${brackets[0]}${command.usage?.type.join(" | ")}${brackets[1]}`
                    : `${brackets[0]}${command.usage?.type}${brackets[1]}`
                : ``;
        if (parsedTypes && parsedTypes.length !== 0) text = parsedTypes.join(" ");

        return `${prefix}${command.name} ${text}`;
    }

    private async buildHelp(message: Message) {
        const commands = await this.fetchCommands(message);
        const helpMessage: { name: string; value: string }[] = [];

        commands.sort((_, __, a, b) => categoryLevel[a] - categoryLevel[b]);
        for (const [category, list] of commands) {
            helpMessage.push({
                name: `${category} commands (${list.length})`,
                value: list.map((cmd) => `\`${cmd.name}\``).join(", "),
            });
        }
        return helpMessage;
    }

    private async fetchCommands(message: Message) {
        const commands = this.container.stores.get("commands");
        const filtered = new Collection<string, KoosCommand[]>();
        await Promise.all(
            commands.map(async (cmd) => {
                const command = cmd as unknown as KoosCommand;
                if (command.hidden || !command.enabled) return;

                const result = await cmd.preconditions.messageRun(message, command as any, { command: null! });
                if (result.err().isSome() && Reflect.get(result.err().unwrap(), "identifier") === "OwnerOnly") return;

                const category = filtered.get(`${command.fullCategory.at(-1) ?? command.category}`);
                if (category) category.push(command);
                else filtered.set(`${command.fullCategory.at(-1) ?? command.category}`, [command as KoosCommand]);
            })
        );

        return filtered.sort(sortCommandsAlphabetically);
    }
}

function sortCommandsAlphabetically(_: KoosCommand[], __: KoosCommand[], firstCategory: string, secondCategory: string): 1 | -1 | 0 {
    if (firstCategory > secondCategory) return 1;
    if (secondCategory > firstCategory) return -1;
    return 0;
}
