import { MeiliCategories, type MeiliDocument,type  MeiliIndex } from "#lib/types/interfaces/Meili";
import { envParseString } from "@skyra/env-utilities";
import { MeiliSearch, type SearchResponse } from "meilisearch";

export class MeilisearchClient extends MeiliSearch {
    public constructor() {
        super({
            host: envParseString("MEILISEARCH_URL_SECRET"),
            apiKey: envParseString("MEILISEARCH_API_SECRET"),
        });
    }

    public async sync(): Promise<void> {
        const indexes = await super.getIndexes();

        for (const index of Object.values(MeiliCategories)) {
            if (!indexes.results.some(({ uid }) => index === uid)) {
                await super.createIndex(index);
            }
        }
    }

    public async get<T = unknown>(index: MeiliIndex, searchString: string) {
        return super
            .index(index) //
            .search<MeiliDocument<typeof index>>(searchString, {
                limit: 25,
            }) as unknown as Promise<SearchResponse<T>>;
    }

    public async upsertMany(index: MeiliIndex, documents: MeiliDocument<typeof index>[]) {
        return super
            .index(index) //
            .addDocuments(documents);
    }

    public async update(index: MeiliIndex, document: MeiliDocument<typeof index>) {
        return super
            .index(index) //
            .updateDocuments([document]);
    }

    public async updateMany(index: MeiliIndex, documents: MeiliDocument<typeof index>[]) {
        return super
            .index(index) //
            .updateDocuments(documents);
    }

    public async resetIndex(index: MeiliIndex, documents: MeiliDocument<typeof index>[]) {
        await super.index(index).deleteAllDocuments();

        if (index === "commands")
            super.index(index).updateSettings({
                searchableAttributes: ["name", "aliases"],
                displayedAttributes: ["name", "description", "aliases"],
            });

        return super
            .index(index) //
            .updateDocuments(documents);
    }
}
