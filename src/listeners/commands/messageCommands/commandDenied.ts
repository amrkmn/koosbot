import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener, type MessageCommandDeniedPayload, UserError } from "@sapphire/framework";
import { reply } from "@sapphire/plugin-editable-commands";
import { EmbedBuilder } from "discord.js";
import prettyMs from "pretty-ms";

@ApplyOptions<Listener.Options>({
    name: Events.MessageCommandDenied,
})
export class ClientListener extends Listener<typeof Events.MessageCommandDenied> {
    public override async run(error: UserError, { message, command }: MessageCommandDeniedPayload) {
        let content: string = error.message;
        if (Reflect.get(Object(error.context), "silent")) return;
        if (this.isCooldownError(error) || this.isVoiceOnlyError(error)) {
            content = error.message;
            if (this.isCooldownError(error)) {
                let { remaining } = error.context as { readonly remaining: number };
                content = `Please wait ${prettyMs(remaining, { verbose: true })} before using \`${command.name}\` again.`;
            }
        }

        reply(message, { embeds: [new EmbedBuilder().setDescription(content).setColor(KoosColor.Error)] });
    }

    private isVoiceOnlyError(error: UserError) {
        if (error.identifier === "VoiceOnly") return true;
        else return false;
    }

    private isCooldownError(error: UserError) {
        if (error.identifier === "preconditionCooldown") return true;
        else return false;
    }
}
