import { config } from "dotenv";
import { resolve } from "path";

import { ApplicationCommandRegistries, RegisterBehavior } from "@sapphire/framework";
import "@sapphire/plugin-logger/register";
import "@sapphire/plugin-editable-commands/register";
import "@sapphire/plugin-api/register";

import * as colorette from "colorette";
import { inspect } from "util";

config({ path: resolve(process.cwd(), ".env") });
inspect.defaultOptions.depth = 1;
colorette.createColors({ useColor: true });

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);
