import { createContextualize } from "./createContextualize";
import { createEntityReducer } from "./createEntityReducer";

export const createEntity = <Entity extends Record<string, any>>(
  ...args: Parameters<typeof createEntityReducer<Entity>>
) => createContextualize(createEntityReducer(...args));
