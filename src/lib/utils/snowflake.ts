import { Snowflake } from "@sapphire/snowflake";

const snowflake = new Snowflake(1684991400000);

export function generate() {
    return `${snowflake.generate()}`;
}

export function deconstruct(id: string) {
    return snowflake.deconstruct(id);
}
