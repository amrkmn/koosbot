import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener, MessageCommandDeniedPayload, UserError } from "@sapphire/framework";
import { reply } from "@sapphire/plugin-editable-commands";
import prettyMs from "pretty-ms";

@ApplyOptions<Listener.Options>({
    name: Events.MessageCommandDenied,
})
export class ClientListener extends Listener<typeof Events.MessageCommandDenied> {
    public override async run(error: UserError, { message }: MessageCommandDeniedPayload) {
        let content: string = error.message;
        if (Reflect.get(Object(error.context), "silent")) return;
        if (this.isCooldownError(error) || this.isVoiceOnlyError(error)) {
            if (this.isCooldownError(error)) {
                let { remaining } = error.context as { readonly remaining: number };
                content = `Please wait ${prettyMs(remaining, { verbose: true })} before using that command again.`;
            }
            content = error.message;
        }

        reply(message, content);
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
