import { Precondition } from "@sapphire/framework";
import type { CommandInteraction, Message, ContextMenuInteraction } from "discord.js";

const OWNERS = process.env.CLIENT_OWNERS;

export class OwnerOnlyPrecondition extends Precondition {
    public override async messageRun(message: Message) {
        return this.checkOwner(message.author.id);
    }
    public override async chatInputRun(interaction: CommandInteraction) {
        return this.checkOwner(interaction.user.id);
    }
    public override async contextMenuRun(interaction: ContextMenuInteraction) {
        return this.checkOwner(interaction.user.id);
    }

    private checkOwner(userId: string) {
        if (OWNERS)
            OWNERS.includes(userId)
                ? this.ok()
                : this.error({ message: "This command can only be used by the owner.", context: { silent: true } });
        return this.error({ message: "This command can only be used by the owner.", context: { silent: true } });
    }
}

declare module "@sapphire/framework" {
    interface Preconditions {
        OwnerOnly: never;
    }
}
