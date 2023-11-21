import { Reducer } from "react";

type EntityId = number | string;
export const createEntityReducer = <Entity extends Record<string, any>>(
  getEntityId: (entity: Entity) => EntityId
) => {
  type UpdatePayload = { id: EntityId; partial: Partial<Entity> };
  type InnerAction = { onResolve?: (state: Entity[]) => void } & (
    | { type: "setOne"; payload: Entity }
    | { type: "addOne"; payload: Entity }
    | { type: "addMany"; payload: Entity[] }
    | { type: "removeOne"; payload: EntityId }
    | { type: "removeMany"; payload: EntityId[] }
    | { type: "updateOne"; payload: UpdatePayload }
    | {
        type: "updateMany";
        payload: Array<UpdatePayload>;
      }
    | { type: "upsertOne"; payload: Entity }
    | {
        type: "upsertMany";
        payload: Array<Entity>;
      }
  );

  const getState: Reducer<Entity[], InnerAction> = (state, action) => {
    const getIndex = (entityId: EntityId, $state: Entity[] = state) =>
      $state.findIndex((stateEntity) => getEntityId(stateEntity) === entityId);
    switch (action.type) {
      case "setOne": {
        const index = getIndex(getEntityId(action.payload));
        if (index < 0) return state;
        return state.toSpliced(index, 1, action.payload);
      }
      case "addOne": {
        if (getIndex(getEntityId(action.payload)) >= 0) return state;
        return [...state, action.payload];
      }
      case "addMany": {
        let $state = [...state];
        let updated = false;
        action.payload.forEach((payload) => {
          const updatedState = getState($state, {
            type: "addOne",
            payload,
          });
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
        return state.toSpliced(index, 1);
      }
      case "removeMany": {
        let $state = [...state];
        let updated = false;
        action.payload.forEach((payload) => {
          const updatedState = getState($state, {
            type: "removeOne",
            payload,
          });
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
        return state.map((curr, i) =>
          i !== index ? curr : { ...curr, ...action.payload.partial }
        );
      }
      case "updateMany": {
        let $state = [...state];
        let updated = false;
        action.payload.forEach((payload) => {
          const updatedState = getState($state, {
            type: "updateOne",
            payload,
          });
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
          });
        return getState(state, { type: "addOne", payload: action.payload });
      }
      case "upsertMany": {
        let $state = [...state];
        let updated = false;
        action.payload.forEach((payload) => {
          const updatedState = getState($state, {
            type: "upsertOne",
            payload,
          });
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

  const reducer: Reducer<Entity[], InnerAction> = (state, action) => {
    const $state = getState(state, action);
    return $state;
  };

  return reducer;
};
