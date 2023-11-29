import { Reducer } from "react";

export type EntityId = number | string;
export type Entity = Record<string, any>;

export type EntityState<E extends Entity> = E[] | undefined;

export type EntityUpdatePayload<E extends Entity> = {
  id: EntityId;
  partial: Partial<E>;
};

export type EntityInnerAction<E extends Entity> = {
  onResolve?: (state: EntityState<E>) => void;
} & (
  | { type: "setOne"; payload: E }
  | { type: "addOne"; payload: E }
  | { type: "addMany"; payload: E[] }
  | { type: "removeOne"; payload: EntityId }
  | { type: "removeMany"; payload: EntityId[] }
  | { type: "updateOne"; payload: EntityUpdatePayload<E> }
  | {
      type: "updateMany";
      payload: Array<EntityUpdatePayload<E>>;
    }
  | { type: "upsertOne"; payload: E }
  | {
      type: "upsertMany";
      payload: Array<E>;
    }
);

export type EntityReducer<E extends Entity> = Reducer<
  EntityState<E>,
  EntityInnerAction<E>
>;

export type CreateEntityReducerParams<E extends Entity> = [
  getEntityId: (entity: E) => EntityId
];
