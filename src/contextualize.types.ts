import React, { Reducer } from "react";

export type ContextualizeState<State> = State | undefined;

export type Action<State> = {
  type: string;
  payload: any;
  /**
   * @deprecated `useContextDispatch` returns an async dispatcher
   */
  onResolve?: (state: State) => void;
};

export type ContextualizeInnerAction<State> = {
  type: "set";
  payload: State;
  /**
   * @deprecated `useContextDispatch` returns an async dispatcher
   */
  onResolve?: (state: State) => void;
};
export type ContextualizeContextState<State, Actions extends Action<State>> = {
  getState: () => State;
  addListener: (callback: (state: State) => void) => () => void;
  dispatch: (
    action: Actions | ContextualizeInnerAction<State>
  ) => Promise<State>;
};

export type ContextualizeContext<
  State,
  Actions extends Action<State>
> = React.Context<ContextualizeContextState<State, Actions>>;

export type ContextualizeReducer<
  State,
  Actions extends Action<State> = ContextualizeInnerAction<State>
> = React.Reducer<
  State,
  | (Actions & {
      onResolve: (state: State) => void;
    })
  | Required<ContextualizeInnerAction<State>>
>;

export type ContextualizeProvider<State> = React.ComponentType<
  React.PropsWithChildren<{ initialState?: State }>
>;

export type ContextualizeSelectorHook<State> = {
  <Selector extends (state: State) => unknown>(
    selector: Selector,
    deps: Array<unknown>
  ): ReturnType<Selector>;
  (): State;
};

export type ContextualizeDispatcher<
  State,
  Actions extends Action<State>
> = () => (action: Actions | ContextualizeInnerAction<State>) => Promise<State>;

export type Contextualize<State, Actions extends Action<State>> = {
  context: ContextualizeContext<State, Actions>;
  Provider: ContextualizeProvider<State>;
  useContextSelector: ContextualizeSelectorHook<State>;
  useContextDispatch: ContextualizeDispatcher<State, Actions>;
};
