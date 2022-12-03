import { Argument, Command } from "@sapphire/framework";

export namespace KoosArgument {
    export type Context = Argument.Context<Command> & {
        filter?: (entry: Command) => boolean;
        owners?: boolean;
    };
    export type AwaitableResult<T> = Argument.AwaitableResult<T>;
    export type AsyncResult<T> = Argument.AsyncResult<T>;
    export type Options = Argument.Options;
    export type Result<T> = Argument.Result<T>;
}
