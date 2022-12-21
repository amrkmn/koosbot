import { KoosCommand } from "#lib/extensions";
import { PermissionLevels } from "#lib/types/Enums";
import { KoosArgument } from "#lib/interfaces";
import { Argument } from "@sapphire/framework";
import { envParseArray } from "#env";

export class UserArgument extends Argument<KoosCommand> {
    public async run(parameter: string, context: KoosArgument.Context) {
        const commands = this.container.stores.get("commands");
        const found = commands.get(parameter.toLowerCase()) as KoosCommand | undefined;
        if (found) {
            console.log(this.isAllowed(found, context));
            return this.isAllowed(found, context)
                ? this.ok(found)
                : this.error({
                      parameter,
                      identifier: "commandCannotResolve",
                      message: `I could not resolve "${parameter}" to a command! Make sure you typed its name or one of its aliases correctly!`,
                  });
        }

        return this.error({ parameter, message: `I couldn't find that command`, identifier: "commandNotFound" });
    }

    private isAllowed(command: KoosCommand, context: KoosArgument.Context): boolean {
        if (command.permissionLevel !== PermissionLevels.BotOwner) return true;
        return context.owners ?? Array.from(envParseArray("CLIENT_OWNERS")).includes(context.message.author.id);
    }
}

declare module "@sapphire/framework" {
    interface ArgType {
        commandName: KoosCommand;
    }
}
