import { Entity, EntityId, EntityReducer, EntityState } from "./entity.types";

export const createEntityReducer = <E extends Entity>(
  getEntityId: (entity: E) => EntityId
): EntityReducer<E> => {
  type State = EntityState<E>;
  type Reducer = EntityReducer<E>;

  const getState: Reducer = (state, action) => {
    const getIndex = (entityId: EntityId, $state: State = state) =>
      $state?.findIndex(
        (stateEntity) => getEntityId(stateEntity) === entityId
      ) ?? -1;
    switch (action.type) {
      case "setOne": {
        const index = getIndex(getEntityId(action.payload));
        if (index < 0) return state;
        return (state ?? [])?.toSpliced(index, 1, action.payload);
      }
      case "addOne": {
        if (getIndex(getEntityId(action.payload)) >= 0) return state;
        return [...(state ?? []), action.payload];
      }
      case "addMany": {
        let $state = [...(state ?? [])];
        let updated = false;
        action.payload.forEach((payload) => {
          const updatedState =
            getState($state, {
              type: "addOne",
              payload,
            }) ?? $state;
          if (updatedState === $state) return;
          $state = updatedState;
          updated = true;
        });
        if (!updated) return state;
        return $state;
      }
      case "removeOne": {
        const index = getIndex(action.payload);
        if (index < 0) return state;
        return state?.toSpliced(index, 1);
      }
      case "removeMany": {
        if (!state) return state;
        let $state = [...state];
        let updated = false;
        action.payload.forEach((payload) => {
          const updatedState =
            getState($state, {
              type: "removeOne",
              payload,
            }) ?? $state;
          if (updatedState === $state) return;
          $state = updatedState;
          updated = true;
        });
        if (!updated) return state;
        return $state;
      }
      case "updateOne": {
        const index = getIndex(action.payload.id);
        if (index < 0) return state;
        return state?.map((curr, i) =>
          i !== index ? curr : { ...curr, ...action.payload.partial }
        );
      }
      case "updateMany": {
        if (!state) return state;
        let $state = [...state];
        let updated = false;
        action.payload.forEach((payload) => {
          const updatedState =
            getState($state, {
              type: "updateOne",
              payload,
            }) ?? $state;
          if (updatedState === $state) return;
          $state = updatedState;
          updated = true;
        });
        if (!updated) return state;
        return $state;
      }
      case "upsertOne": {
        const entityId = getEntityId(action.payload);
        const index = getIndex(entityId);
        if (index >= 0)
          return getState(state, {
            type: "updateOne",
            payload: { id: entityId, partial: action.payload },
          }) as E[];
        return getState(state, {
          type: "addOne",
          payload: action.payload,
        }) as E[];
      }
      case "upsertMany": {
        let $state = [...(state ?? [])];
        let updated = false;
        action.payload.forEach((payload) => {
          const updatedState =
            getState($state, {
              type: "upsertOne",
              payload,
            }) ?? $state;
          if (updatedState === $state) return;
          $state = updatedState;
          updated = true;
        });
        if (!updated) return state;
        return $state;
      }
      default: {
        return state;
      }
    }
  };

  const reducer: Reducer = (state, action) => {
    const $state = getState(state, action);
    return $state;
  };

  return reducer;
};
