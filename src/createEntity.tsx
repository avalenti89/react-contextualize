import { Action, createContextualize } from "./createContextualize";
import { createEntityReducer } from "./createEntityReducer";

export const createEntity = <
  Entity extends Record<string, any>,
  Actions extends Action<Entity[]> = Action<Entity[]>
>(
  ...args: Parameters<typeof createEntityReducer<Entity, Actions>>
) => createContextualize(createEntityReducer(...args));