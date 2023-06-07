import { KoosCommand } from "#lib/extensions";
import { type KoosArgument } from "#lib/types";
import { Argument } from "@sapphire/framework";
import { envParseArray } from "@skyra/env-utilities";
import { oneLine } from "common-tags";

export class CommandNameArgument extends Argument<KoosCommand> {
    public async run(parameter: string, ctx: KoosArgument.Context) {
        const commands = this.container.stores.get("commands");
        const found = commands.get(parameter.toLowerCase()) as KoosCommand | undefined;
        if (found) {
            return (await this.isAllowed(found, ctx))
                ? this.ok(found)
                : this.error({
                      parameter,
                      identifier: "commandCannotResolve",
                      message: oneLine`
                        I could not resolve \`${parameter}\` to a command!
                        Make sure you typed its name or one of its aliases correctly!
                      `,
                  });
        }

        return this.error({ parameter, message: `I couldn't find that command`, identifier: "commandNotFound" });
    }

    private async isAllowed(command: KoosCommand, ctx: KoosArgument.Context): Promise<boolean> {
        const result = await command.preconditions.messageRun(ctx.message, command as any, { command: null! });
        if (result.isErr() && Reflect.get(result.unwrapErr(), "identifier") === "OwnerOnly") return false;
        if (command.hidden) return false;

        return Array.from(envParseArray("CLIENT_OWNERS")).includes(ctx.message.author.id);
    }
}

declare module "@sapphire/framework" {
    interface ArgType {
        commandName: KoosCommand;
    }
}
