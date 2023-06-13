import { Command, SapphireClient, UserPermissionsPrecondition, type PreconditionEntryResolvable } from "@sapphire/framework";
import { Time } from "@sapphire/timestamp";
import { Message as DiscordMessage, PermissionFlagsBits, PermissionsBitField, type PermissionResolvable } from "discord.js";

export abstract class KoosCommand extends Command {
    public client: SapphireClient;
    public readonly hidden: boolean;

    constructor(ctx: Command.Context, options: KoosCommand.Options) {
        const resolvedPermissions = new PermissionsBitField(options.clientPermissions ?? options.requiredClientPermissions)
            .add(PermissionFlagsBits.SendMessages)
            .add(PermissionFlagsBits.ViewChannel)
            .add(PermissionFlagsBits.EmbedLinks);
        const userResolvedPermissions = new PermissionsBitField(options.permissions ?? options.requiredUserPermissions)
            .add(PermissionFlagsBits.SendMessages)
            .add(PermissionFlagsBits.SendMessagesInThreads);

        options.typing ??= false;
        options.cooldown ??= Time.Second * 2.5;
        options.generateDashLessAliases ??= true;
        options.generateUnderscoreLessAliases ??= true;

        super(ctx, {
            ...options,
            ...KoosCommand.resolvePreConditions(ctx, options),
            requiredClientPermissions: resolvedPermissions,
            requiredUserPermissions: userResolvedPermissions,
        });

        this.client = this.container.client;
        this.hidden = options.hidden ?? false;
    }

    protected static resolvePreConditions(_ctx: Command.Context, options: KoosCommand.Options): KoosCommand.Options {
        options.generateDashLessAliases ??= true;

        const preconditions = (options.preconditions ??= []) as PreconditionEntryResolvable[];
        preconditions.push("GuildOnly");

        if (options.permissions) {
            preconditions.push(new UserPermissionsPrecondition(options.permissions));
        }
        if (options.cooldown) {
            preconditions.push({
                name: "Cooldown",
                context: { limit: options.bucket ?? 1, delay: options.cooldown },
            });
        }

        options.preconditions = preconditions;

        return options;
    }
}

export namespace KoosCommand {
    export type Options = Command.Options & {
        clientPermissions?: PermissionResolvable;
        permissions?: PermissionResolvable;
        hidden?: boolean;
        bucket?: number;
        cooldown?: number;
    };
    export type Message = DiscordMessage;
    export type ChatInputCommandInteraction = Command.ChatInputCommandInteraction;
    export type AutocompleteInteraction = Command.AutocompleteInteraction;
    export type ContextMenuCommandInteraction = Command.ContextMenuCommandInteraction;
    export type Context = Command.Context;
    export type JSON = Command.JSON;
    export type Registry = Command.Registry;
    export type RunInTypes = Command.RunInTypes;
}
