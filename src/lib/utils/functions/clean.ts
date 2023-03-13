import { regExpEsc, isNullishOrEmpty } from "@sapphire/utilities";

let sensitivePattern: string | RegExp;
const zws = "\u200B";

/**
 * Cleans sensitive info from strings
 * @since 0.0.1
 * @param text The text to clean
 */
export function clean(text: string) {
    initClean([...secrets()]);
    if (typeof sensitivePattern === "undefined") {
        throw new Error("initClean must be called before running this.");
    }
    return text.replace(sensitivePattern, "「ｒｅｄａｃｔｅｄ」").replace(/`/g, `\`${zws}`).replace(/@/g, `@${zws}`);
}

/**
 * Initializes the sensitive patterns for clean()
 * @param tokens The tokens to clean
 */
export function initClean(tokens: readonly string[]) {
    sensitivePattern = new RegExp(tokens.map(regExpEsc).join("|"), "gi");
}

function secrets() {
    const secrets = new Set<string>();
    const suffixes = ["_KEY", "_TOKEN", "_SECRET", "_PASSWORD"];
    for (const [key, value] of Object.entries(process.env)) {
        if (isNullishOrEmpty(value)) continue;
        if (suffixes.some((suffix) => key.endsWith(suffix))) secrets.add(value);
    }
    return secrets;
}
