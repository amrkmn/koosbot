import { envParseArray } from "@skyra/env-utilities";
import { Precondition } from "@sapphire/framework";
import { isNullishOrEmpty } from "@sapphire/utilities";
import type { CommandInteraction, Message, ContextMenuCommandInteraction } from "discord.js";

export class OwnerOnlyPrecondition extends Precondition {
    public override async messageRun(message: Message) {
        return this.checkOwner(message.author.id);
    }
    public override async chatInputRun(interaction: CommandInteraction) {
        return this.checkOwner(interaction.user.id);
    }
    public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
        return this.checkOwner(interaction.user.id);
    }

    private checkOwner(userId: string) {
        const OWNERS = envParseArray("CLIENT_OWNERS");

        if (isNullishOrEmpty(OWNERS))
            return this.error({ message: "This command can only be used by the owner.", context: { silent: true } });

        return OWNERS.includes(userId)
            ? this.ok()
            : this.error({ message: "This command can only be used by the owner.", context: { silent: true } });
    }
}

declare module "@sapphire/framework" {
    interface Preconditions {
        OwnerOnly: never;
    }
}
