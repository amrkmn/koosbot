import type { KoosEnv } from './types.js';

declare global {
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ProcessEnv extends KoosEnv {}
  }
}
export {};
