import { Command, PreconditionEntryResolvable, SapphireClient, UserPermissionsPrecondition } from "@sapphire/framework";
import { PermissionLevels } from "#lib/types/Enums";
import type { PermissionResolvable } from "discord.js";
import { isString } from "#utils/functions";
import { isNullOrUndefined } from "@sapphire/utilities";
import { Time } from "@sapphire/timestamp";

interface CommandUsage {
    type?: string | string[];
    required?: boolean;
    arrayOfTypes?: { type: string | string[]; required?: boolean }[];
}

export class KoosCommand extends Command {
    public client: SapphireClient;
    public readonly permissionLevel: PermissionLevels;
    public readonly usage?: CommandUsage;
    public readonly hidden: boolean;

    constructor(ctx: Command.Context, options: KoosCommand.Options) {
        super(ctx, { ...options, ...KoosCommand.resolvePreConditions(ctx, options) });
        const usage = options.usage as CommandUsage;

        options.typing ??= false;
        options.cooldown ??= Time.Second * 2.5;
        options.requiredUserPermissions = options.permissions;

        this.client = this.container.client;
        this.permissionLevel = options.permissionLevels ?? PermissionLevels.Everyone;
        this.hidden = options.hidden ?? false;
        this.usage =
            !isNullOrUndefined(usage) && isString(usage)
                ? {
                      type: usage as string,
                      required: isString(usage) ? true : false,
                      arrayOfTypes: [],
                  }
                : {
                      type: Reflect.get(usage ?? {}, "type"),
                      required: Reflect.get(usage ?? {}, "required") ?? false,
                      arrayOfTypes: Reflect.get(usage ?? {}, "arrayOfTypes"),
                  };
    }

    protected static resolvePreConditions(_context: Command.Context, options: KoosCommand.Options): KoosCommand.Options {
        options.generateDashLessAliases ??= true;

        const preconditions = (options.preconditions ??= []) as PreconditionEntryResolvable[];

        if (options.permissions) {
            preconditions.push(new UserPermissionsPrecondition(options.permissions));
        }

        const permissionLevelPreCondition = this.resolvePermissionLevelPreCondition(options.permissionLevels);
        if (permissionLevelPreCondition !== null) {
            preconditions.push(permissionLevelPreCondition);
        }
        if (options.cooldown) {
            preconditions.push({
                name: "Cooldown",
                context: { limit: options.bucket ?? 1, delay: options.cooldown },
            });
        }

        return options;
    }

    protected static resolvePermissionLevelPreCondition(permissionLevel = 0): PreconditionEntryResolvable | null {
        if (permissionLevel === 0) return null;
        if (permissionLevel <= PermissionLevels.Administrator) {
            return ["OwnerOnly", "Administrator"];
        }
        if (permissionLevel <= PermissionLevels.BotOwner) return "OwnerOnly";
        return null;
    }
}

export namespace KoosCommand {
    export type Options = Command.Options & {
        permissionLevels?: number;
        usage?: CommandUsage | string;
        permissions?: PermissionResolvable;
        hidden?: boolean;
        guarded?: boolean;
        bucket?: number;
        cooldown?: number;
    };
    export type ChatInputInteraction = Command.ChatInputInteraction;
    export type AutocompleteInteraction = Command.AutocompleteInteraction;
    export type ContextMenuInteraction = Command.ContextMenuInteraction;
    export type Context = Command.Context;
    export type JSON = Command.JSON;
    export type Registry = Command.Registry;
    export type RunInTypes = Command.RunInTypes;
}
