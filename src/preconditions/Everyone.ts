import { Precondition } from "@sapphire/framework";

export class EveryonePreconditions extends Precondition {
    public async run() {
        return this.ok();
    }
}
