import { Argument, ArgumentContext, Piece } from "@sapphire/framework";
import { oneLine } from "common-tags";

export class PieceArgument extends Argument<Piece> {
    public async run(parameter: string, context: ArgumentContext) {
        for (const store of this.container.stores.values()) {
            const piece = store.get(parameter);
            if (piece) return this.ok(piece);
        }
        return this.error({
            context,
            parameter,
            identifier: `arguments:piece`,
            message: oneLine`
                I could not resolve \`${parameter}\` to a piece!
                Make sure you typed its name or one of its aliases correctly!
            `,
        });
    }
}

declare module "@sapphire/framework" {
    interface ArgType {
        piece: Piece;
    }
}
