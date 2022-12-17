import { Argument, ArgumentContext, Piece } from "@sapphire/framework";

export class UserArgument extends Argument<Piece> {
    public async run(parameter: string, context: ArgumentContext) {
        for (const store of this.container.stores.values()) {
            const piece = store.get(parameter);
            if (piece) return this.ok(piece);
        }
        return this.error({
            context,
            parameter,
            identifier: `arguments:piece`,
            message: [
                `I could not resolve \`${parameter}\` to a piece!`,
                `Make sure you typed its name or one of its aliases correctly!`,
            ].join(" "),
        });
    }
}

declare module "@sapphire/framework" {
    interface ArgType {
        piece: Piece;
    }
}
