import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener, UserError, ChatInputCommandDeniedPayload } from "@sapphire/framework";
import prettyMs from "pretty-ms";

@ApplyOptions<Listener.Options>({
    name: Events.ChatInputCommandDenied,
})
export class ClientListener extends Listener<typeof Events.ChatInputCommandDenied> {
    public override async run(error: UserError, { interaction, command }: ChatInputCommandDeniedPayload) {
        let content: string = error.message;
        if (Reflect.get(Object(error.context), "silent")) return;
        if (this.isCooldownError(error) || this.isVoiceOnlyError(error)) {
            content = error.message;
            if (this.isCooldownError(error)) {
                let { remaining } = error.context as { readonly remaining: number };
                content = `Please wait ${prettyMs(remaining, { verbose: true })} before using \`${command.name}\` again.`;
            }
        }

        if (interaction.deferred) return interaction.followUp({ embeds: [{ description: content, color: embedColor.error }] });

        return interaction.reply({ embeds: [{ description: content, color: embedColor.error }] });
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
