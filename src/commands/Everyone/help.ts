import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args, type SapphirePrefix } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish, isObject } from "@sapphire/utilities";
import { Collection, EmbedBuilder, Message } from "discord.js";

const categoryLevel: { [key: string]: number } = {
    Everyone: 0,
    Playlist: 2,
    DJ: 3,
    Admin: 6,
};

@ApplyOptions<KoosCommand.Options>({
    description: `Lists all the commands`,
    aliases: ["h", "cmds", "cmd"],
    detailedDescription: {
        usages: [";command"],
    },
})
export class HelpCommand extends KoosCommand {
    private readonly forbiddenCategories = ["Owner"];

    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option //
                        .setName("command")
                        .setDescription("Get info about a specific command.")
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        );
    }

    public async autocompleteRun(interaction: KoosCommand.AutocompleteInteraction) {
        const search = interaction.options.getString("command")?.toLowerCase();

        if (search) {
            const commands = this.container.stores
                .get("commands")
                .filter((cmd) => cmd.aliases.some((alias) => alias.includes(search)) || cmd.name.includes(search))
                .map((cmd) => ({ name: cmd.name, value: cmd.name }));
            return interaction.respond(commands);
        }

        const allCommands = this.container.stores
            .get("commands")
            .map((cmd) => ({ name: cmd.name, value: cmd.name }))
            .splice(0, 25);
        return interaction.respond(allCommands);
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const prefix = "/";
        const option = interaction.options.getString("command");

        await interaction.deferReply({ ephemeral: true });

        if (!isNullish(option)) {
            const command = this.container.stores.get("commands").get(option) as KoosCommand | undefined;
            if (!command || (command && this.forbiddenCategories.includes(command.category ?? "")))
                return interaction.followUp({
                    embeds: [new EmbedBuilder().setDescription(`I couldn't find that command`).setColor(KoosColor.Error)],
                    ephemeral: true,
                });

            const buildedCommand = await this.buildCommand(command);
            const aliases = buildedCommand.aliases && buildedCommand.aliases.length ? buildedCommand.aliases.join(", ") : undefined;

            const usage = this.parseUsage(command, prefix);

            return interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setFields(
                            { name: `${buildedCommand.name} ${aliases ? `(${aliases})` : ``}`, value: buildedCommand.description },
                            { name: `• Usage`, value: usage },
                            { name: `• Permission`, value: `\`${buildedCommand.category}\`` }
                        )
                        .setColor(KoosColor.Default),
                ],
            });
        }

        const help = await this.buildChatInputHelp(interaction);

        return interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setFields(help)
                    .setColor(KoosColor.Default)
                    .setFooter({ text: `Use ${prefix}help [ command ] to get more information about a command` })
                    .setAuthor({
                        name: `${this.client.user?.username}'s Command List`,
                        iconURL: this.client.user?.displayAvatarURL(),
                    }),
            ],
        });
    }

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
                    new EmbedBuilder()
                        .setFields(
                            { name: `${buildedCommand.name} ${aliases ? `(${aliases})` : ``}`, value: buildedCommand.description },
                            { name: `• Usage`, value: usage },
                            { name: `• Permission`, value: `\`${buildedCommand.category}\`` }
                        )
                        .setColor(KoosColor.Default),
                ],
            });
        } else if (command.isErr() && ["commandCannotResolve", "commandNotFound"].includes(command.err().unwrap().identifier))
            return send(message, {
                embeds: [new EmbedBuilder().setDescription(`${command.err().unwrap().message}`).setColor(KoosColor.Error)],
            });

        const help = await this.buildMessageHelp(message);

        send(message, {
            embeds: [
                new EmbedBuilder()
                    .setFields(help)
                    .setColor(KoosColor.Default)
                    .setFooter({ text: `Use ${prefix}help [ command ] to get more information about a command` })
                    .setAuthor({
                        name: `${this.client.user?.username}'s Command List`,
                        iconURL: this.client.user?.displayAvatarURL(),
                    }),
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

    parseUsage(command: KoosCommand, prefix: SapphirePrefix) {
        const { detailedDescription } = command;

        if (!isNullish(detailedDescription) && !isObject(detailedDescription)) return `${prefix}${command.name}`;

        const usages = detailedDescription.usages;
        if (isNullish(usages)) return `${prefix}${command.name}`;

        const parsed = usages.map((usage) => {
            let brackets = usage.startsWith(":") ? "{}" : "[]";
            usage = usage.replaceAll(/[:;]/g, "");

            if (usage.includes("|")) {
                let types = usage.split("|").map((usage) => usage.trim());
                return `${brackets[0]} ${types.join(" | ")} ${brackets[1]}`;
            }

            return `${brackets[0]} ${usage} ${brackets[1]}`;
        });

        return `${prefix}${command.name} ${parsed.join(" ")}`;
    }

    private async buildChatInputHelp(interaction: KoosCommand.ChatInputCommandInteraction) {
        const commands = await this.fetchChatInputCommands(interaction);
        const helpMessage: { name: string; value: string }[] = [];

        commands.sort((_, __, a, b) => categoryLevel[a] - categoryLevel[b]);
        for (const [category, list] of commands) {
            list.sort((a, b) => a.name.localeCompare(b.name));
            helpMessage.push({
                name: `${category} commands`,
                value: list.map((cmd) => `\`${cmd.name}\``).join(", "),
            });
        }
        return helpMessage;
    }

    private async buildMessageHelp(message: Message) {
        const commands = await this.fetchMessageCommands(message);
        const helpMessage: { name: string; value: string }[] = [];

        commands.sort((_, __, a, b) => categoryLevel[a] - categoryLevel[b]);
        for (const [category, list] of commands) {
            list.sort((a, b) => a.name.localeCompare(b.name));
            helpMessage.push({
                name: `${category} commands`,
                value: list.map((cmd) => `\`${cmd.name}\``).join(", "),
            });
        }
        return helpMessage;
    }

    private async fetchChatInputCommands(interaction: KoosCommand.ChatInputCommandInteraction) {
        const commands = this.container.stores.get("commands");
        const filtered = new Collection<string, KoosCommand[]>();

        await Promise.all(
            commands.map(async (cmd) => {
                const command = cmd as unknown as KoosCommand;
                if (command.hidden || !command.enabled) return;

                const result = await cmd.preconditions.chatInputRun(interaction, command as any, { command: null });
                if (result.isErr() && Reflect.get(result.unwrapErr(), "identifier") === "OwnerOnly") return;

                const category = filtered.get(`${command.category}`);
                if (category) category.push(command);
                else filtered.set(`${command.category}`, [command]);
            })
        );

        return filtered.sort(sortCommandsAlphabetically);
    }

    private async fetchMessageCommands(message: Message) {
        const commands = this.container.stores.get("commands");
        const filtered = new Collection<string, KoosCommand[]>();
        await Promise.all(
            commands.map(async (cmd) => {
                const command = cmd as unknown as KoosCommand;
                if (command.hidden || !command.enabled) return;

                const result = await cmd.preconditions.messageRun(message, command as any, { command: null! });
                if (result.isErr() && Reflect.get(result.unwrapErr(), "identifier") === "OwnerOnly") return;

                const category = filtered.get(`${command.category}`);
                if (category) category.push(command);
                else filtered.set(`${command.category}`, [command]);
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
