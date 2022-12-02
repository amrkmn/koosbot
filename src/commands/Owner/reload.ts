import { ApplyOptions } from "@sapphire/decorators";
import { Args, Command, Piece, Store } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { Stopwatch } from "@sapphire/stopwatch";
import { Message } from "discord.js";

@ApplyOptions<Command.Options>({
    description: "Reloads a Sapphire piece, or all pieces of a Sapphire store.",
    aliases: ["r"],
    preconditions: ["OwnerOnly"],
})
export class OwnerCommand extends Command {
    public async messageRun(message: Message, args: Args) {
        const content = await this.reloadAny(message, args);
        return send(message, content);
    }

    // @ts-ignore
    async reloadAny(message: Message, args: Args) {
        if (args.finished) return "Please enter something for me to reload.";
        const everything = await args.pickResult(OwnerCommand.everything);
        if (everything.ok().isSome()) return this.reloadEverything();

        const store = await args.pickResult("store");
        if (store.ok().isSome()) return this.reloadStore(store.unwrap());

        const piece = await args.pickResult("piece");
        if (piece.ok().isSome()) return this.reloadPiece(piece.unwrap());
        return piece.err().unwrap().message;
    }

    async reloadPiece(piece: Piece) {
        const timer = new Stopwatch();
        await piece.reload();
        const type = piece.store.name.slice(0, -1);

        return `Reloaded ${type}: ${piece.name}. (Took: ${timer.stop().toString()})`;
    }

    async reloadStore(store: Store<Piece>) {
        const timer = new Stopwatch();
        await store.loadAll();

        return `Reloaded all ${store.name}. (Took: ${timer.stop().toString()})`;
    }

    async reloadEverything() {
        const timer = new Stopwatch();

        await Promise.all(
            [...this.container.client.stores.values()].map(async (store) => {
                await store.loadAll();
            })
        );

        return `Reloaded everything. (Took: ${timer.stop().toString()})`;
    }

    static everything = Args.make(async (parameter, { argument }) => {
        if (parameter.toLowerCase() === "everything" || parameter.toLowerCase() === "all") return Args.ok("everything");
        return Args.error({
            parameter,
            argument,
            identifier: "reloadInvalidEverything",
            message: `I was not able to resolve \`${parameter}\` to a valid "everything".\n**Hint**: The only possible value is \`everything or all\`.`,
        });
    });
}
