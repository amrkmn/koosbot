import { rm, readdir } from "node:fs/promises";

const rootFolder = new URL("../", import.meta.url);
const distFolder = new URL("dist/", rootFolder);

const options = { recursive: true, force: true };

await readdir(distFolder).then(async (files) => {
    for (let file of files) await rm(new URL(file, distFolder), options);
});

