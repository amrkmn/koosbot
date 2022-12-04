import { rm } from "node:fs/promises";
import { globby } from "globby";
import path from "path";
import posix from "path/posix";

const rootFolder = new URL("../", import.meta.url);
const distFolder = new URL("dist/", rootFolder);

const options = { recursive: true, force: true };

await globby(posix.resolve("dist", "**", "*")).then(async (files) => {
    for (let file of files) await rm(path.resolve(file), options);
});
