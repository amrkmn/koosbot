import { KoosCommand } from "#lib/extensions";
import { permissionLevels } from "#lib/utils/constants";
import { embedColor } from "#utils/constants";
import { isString } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args, SapphirePrefix } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
// import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { Collection, Message } from "discord.js";

const categoryLevel: { [key: string]: number } = {
    Admin: permissionLevels.administrator,
    DJ: permissionLevels.dj,
    Everyone: permissionLevels.everyone,
    General: permissionLevels.everyone,
};

@ApplyOptions<KoosCommand.Options>({
    description: `Lists all the commands`,
    aliases: ["h", "cmds", "cmd"],
    usage: {
        type: "command",
    },
})
export class UserCommand extends KoosCommand {
    public async messageRun(message: Message, args: Args) {
        const prefix = await this.client.fetchPrefix(message);
        const command = await args.pickResult("commandName");

        if (command.isOk()) {
            const commandSuccess = command.unwrap();
            if (commandSuccess.hidden) return;

            const buildedCommand = await this.buildCommand(commandSuccess);
            const aliases = buildedCommand.aliases && buildedCommand.aliases.length ? buildedCommand.aliases.join(", ") : undefined;

            const usage = this.parseUsage(commandSuccess, prefix);

            return send(message, {
                embeds: [
                    {
                        fields: [
                            { name: `${buildedCommand.name} ${aliases ? `(${aliases})` : ``}`, value: buildedCommand.description },
                            { name: `• Usage ${buildedCommand.slashOnly ? `(Slash only)` : ``}`, value: usage },
                            { name: `• Permission`, value: `\`${buildedCommand.category}\`` },
                        ],
                        color: embedColor.default,
                    },
                ],
            });
        } else if (command.isErr() && ["commandCannotResolve", "commandNotFound"].includes(command.err().unwrap().identifier))
            return send(message, {
                embeds: [{ description: `${command.err().unwrap().message}`, color: embedColor.error }],
            });

        const help = await this.buildHelp(message);

        send(message, {
            embeds: [
                {
                    fields: help,
                    color: embedColor.default,
                    footer: { text: `Use ${prefix}help [ command ] to get more information about a command` },
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
        const slashOnly = command.slashOnly;

        return { name, description, aliases, category, slashOnly };
    }

    parseUsage(command: KoosCommand, prefix: SapphirePrefix) {
        const types = command.usage?.types;
        const parsedTypes = types?.map(({ type, required }) => {
            let brackets = required ? `{}` : `[]`;
            return isString(type) || Array.isArray(type)
                ? Array.isArray(type)
                    ? `${brackets[0]} ${type.join(" | ")} ${brackets[1]}`
                    : `${brackets[0]} ${type} ${brackets[1]}`
                : ``;
        });
        let brackets = command.usage?.required ? `{}` : `[]`;
        let text =
            isString(command.usage?.type) || Array.isArray(command.usage?.type)
                ? Array.isArray(command.usage?.type)
                    ? `${brackets[0]} ${command.usage?.type.join(" | ")} ${brackets[1]}`
                    : `${brackets[0]} ${command.usage?.type} ${brackets[1]}`
                : ``;
        if (parsedTypes && parsedTypes.length !== 0) text = parsedTypes.join(" ");

        return `${prefix}${command.name} ${text}`;
    }

    // private parseUsage(command: KoosCommand, prefix: SapphirePrefix): EmbedFieldData[] {
    //     let category = `[${command.fullCategory.at(-1) ?? command.category}]`;
    //     if (isNullish(command.usage)) return [{ name: `${prefix}${command.name}`, value: `${command.description}\n\`${category}\`` }];

    //     let usages: EmbedFieldData[] = [];
    //     let brackets = command.usage.required ? `<>` : `[]`;
    //     let text = "";
    //     if (Array.isArray(command.usage.type)) {
    //         if (command.usage.type.some((value) => isString(value))) {
    //             text = Array.isArray(command.usage?.type)
    //                 ? `${brackets[0]}${command.usage.type.join("|")}${brackets[1]}`
    //                 : `${brackets[0]}${command.usage.type}${brackets[1]}`;
    //         } else {
    //             const types = command.usage.type
    //                 .map((v) => {
    //                     if (isString(v)) return "";
    //                     let brackets = v.required ? `<>` : `[]`;
    //                     return Array.isArray(v.type)
    //                         ? `${brackets[0]}${v.type.join("|")}${brackets[1]}`
    //                         : `${brackets[0]}${v.type}${brackets[1]}`;
    //                 })
    //                 .filter(String);

    //             text = !isNullishOrEmpty(types) ? types.join(" ") : `${command.usage.type.join("|")}`;
    //         }
    //     }

    //     usages.push({
    //         name: `${prefix}${command.name}${text ? ` ${text}` : ``}`,
    //         value: `${command.usage.description ?? command.description ?? "No description provided."}\n\`${category}\``,
    //     });
    //     if (isNullishOrEmpty(command.usage.types) || !Array.isArray(command.usage.types)) return usages;

    //     for (let { type, description, required, subcommand } of command.usage.types) {
    //         let brackets = required ? `<>` : `[]`;
    //         let text = subcommand
    //             ? ` ${Array.isArray(type) ? type.join("|") : type}`
    //             : ` ${brackets[0]}${Array.isArray(type) ? type.join("|") : type}${brackets[1]}`;
    //         usages.push({
    //             name: `${prefix}${command.name}${text}`,
    //             value: `${description ?? "No description provided."}\n\`${category}\``,
    //         });
    //     }

    //     return usages;
    // }

    private async buildHelp(message: Message) {
        const commands = await this.fetchCommands(message);
        const helpMessage: { name: string; value: string }[] = [];

        commands.sort((_, __, a, b) => categoryLevel[a] - categoryLevel[b]);
        for (const [category, list] of commands) {
            helpMessage.push({
                name: `${category} commands`,
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
                if (command.hidden || !command.enabled || command.slashOnly) return;

                const result = await cmd.preconditions.messageRun(message, command as any, { command: null! });
                if (result.isErr() && Reflect.get(result.err().unwrap(), "identifier") === "OwnerOnly") return;

                const category = filtered.get(`${command.category}`);
                if (category) category.push(command);
                else filtered.set(`${command.category}`, [command as KoosCommand]);
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
