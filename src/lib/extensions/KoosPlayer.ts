import { KazagumoPlayer } from "kazagumo";

export class KoosPlayer extends KazagumoPlayer {
    votes = new Set<string>();
}

declare module "kazagumo" {
    interface KazagumoPlayer {
        votes: Set<string>;
    }
}
