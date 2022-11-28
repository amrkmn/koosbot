import { Argument, ArgumentContext, Piece, Store } from "@sapphire/framework";

export class StoreArgument extends Argument<Store<Piece>> {
    public possibles: readonly string[] = [];
    async run(parameter: string, context: ArgumentContext) {
        for (const store of this.container.stores.values()) {
            if (store.name === parameter) return this.ok(store);
        }
        return this.error({
            parameter,
            identifier: "arguments:store",
            context: { ...context, possibles: this.possibles },
            message: `I could not resolve \`${parameter}\` to a valid store!\n**Hint**: the following are supported: ${this.possibles.join(
                ", "
            )}.`,
        });
    }

    onLoad() {
        this.possibles = this.container.stores.map((store) => `\`${store.name}\``);
        return super.onLoad();
    }
}

declare module "@sapphire/framework" {
    interface ArgType {
        store: Store<Piece>;
    }
}
