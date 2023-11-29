import { createContextualize } from "./createContextualize";
import { createEntityReducer } from "./createEntityReducer";
import { CreateEntityReducerParams, Entity } from "./entity.types";

export const createEntity = <E extends Entity>(
  ...args: CreateEntityReducerParams<E>
) => createContextualize(createEntityReducer(...args));
