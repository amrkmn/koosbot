import { KoosCommand } from "#lib/extensions";
import * as functions from "#utils/functions";
import { clean } from "#utils/functions";
import { request } from "@aytea/request";
import { ApplyOptions } from "@sapphire/decorators";
import { type Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { Stopwatch } from "@sapphire/stopwatch";
import Type from "@sapphire/type";
import { codeBlock, isThenable } from "@sapphire/utilities";
import { envParseString } from "@skyra/env-utilities";
import { stripIndents } from "common-tags";
import type { Message } from "discord.js";
import { inspect } from "util";

type HasteBinResponse = {
    key?: string;
    data?: string;
    message?: string;
};

@ApplyOptions<KoosCommand.Options>({
    aliases: ["ev"],
    description: "Evals any JavaScript code",
    quotes: [],
    flags: ["async", "hidden", "showHidden", "silent", "s"],
    options: ["depth"],
    hidden: true,
    preconditions: ["OwnerOnly"],
})
export class EvalCommand extends KoosCommand {
    private codeRegex = /```(?:(?<lang>\S+)\n)?\s?(?<code>[^]+?)\s?```/s;

    private request = request;

    public async messageRun(message: Message, args: Args) {
        const code = this.parseCode(`${await args.rest("string").catch(() => undefined)}`);

        const { result, success, type, time } = await this.eval(message, code, {
            async: args.getFlags("async"),
            depth: args.getOption("depth") === "null" ? null : Number(args.getOption("depth")) ?? 0,
            showHidden: args.getFlags("hidden", "showHidden"),
        });

        const output = success ? `**Output**: ${codeBlock("js", result)}` : `**Error**: ${codeBlock("bash", result)}`;
        if (args.getFlags("silent", "s")) return null;

        const typeFooter = `**Type**: ${codeBlock("typescript", type)}\n${time}`;

        if (result.length > 1800) {
            try {
                const data = await this.request(envParseString("HASTEBIN_POST_URL") as string)
                    .body(result)
                    .options("throwOnError", true)
                    .post()
                    .json<HasteBinResponse>();
                return send(message, {
                    content: stripIndents`
                        **Output**:
                        Output was too long... sent the result to hastebin: ${envParseString("HASTEBIN_GET_URL")}/${data.key}.txt
                        
                        ${typeFooter}
                    `,
                });
            } catch (error: unknown) {
                const content = `${codeBlock("bash", (error as HasteBinResponse)?.message ?? `${error}`)}`;
                return send(message, { content: `**Error**: ${content}\n${typeFooter}` });
            }
        }

        return send(message, `${output}\n${typeFooter}`);
    }

    private async eval(message: Message, code: string, flags: { async: boolean; depth: number | null; showHidden: boolean }) {
        if (flags.async) code = `(async () => {\n${code}\n})();`;

        const { container } = this;
        // @ts-ignore
        const { client, db, genius, manager, shoukaku, stores } = container;
        // @ts-ignore
        const msg = message;
        // @ts-ignore
        const utils = functions;

        const stopwatch = new Stopwatch();
        let success, syncTime, asyncTime, result;
        let thenable = false;

        let type;
        try {
            result = eval(code);
            syncTime = stopwatch;
            type = new Type(result);
            if (isThenable(result)) {
                thenable = true;
                stopwatch.restart();
                result = await result;
                asyncTime = stopwatch.toString();
                type = type;
            }
            success = true;
        } catch (error) {
            if (!syncTime) syncTime = stopwatch.toString();
            if (!type) type = new Type(error);
            if (thenable && !asyncTime) asyncTime = stopwatch.toString();

            result = error;
            success = false;
        }

        stopwatch.stop();
        if (typeof result !== "string") {
            result = inspect(result, {
                depth: flags.depth,
                showHidden: flags.showHidden,
            });
        }
        result = clean(result);

        return { result, success, type: type.toString(), time: this.formatTime(syncTime, asyncTime) };
    }
    formatTime(syncTime: Stopwatch | string, asyncTime?: string) {
        return asyncTime ? `⏱ ${asyncTime}<${syncTime}>` : `⏱ ${syncTime}`;
    }

    parseCode(code: string) {
        let matched = this.codeRegex.exec(`${code}`) as RegExpExecArray;
        if (matched && matched.groups && Reflect.has(matched.groups, "code")) return matched.groups.code;
        return `${code}`;
    }
}
