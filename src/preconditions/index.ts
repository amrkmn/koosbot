export * from "./Administrator.js";
export * from "./OwnerOnly.js";
export * from "./VoiceOnly.js";
export * from "./DJ.js";

declare module "@sapphire/framework" {
    interface Preconditions {
        Administrator: never;
        Moderator: never;
        OwnerOnly: never;
        ServerOwner: never;
        DJ: never;
    }
}
