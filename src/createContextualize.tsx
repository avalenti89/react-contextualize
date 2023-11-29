import React, {
  useReducer,
  useRef,
  useEffect,
  useMemo,
  useContext,
  useState,
  Reducer,
} from "react";
import { missingProviderFallback } from "./missingProviderFallback";
import {
  Action,
  Contextualize,
  ContextualizeContextState,
  ContextualizeInnerAction,
  ContextualizeReducer,
  ContextualizeState,
} from "./contextualize.types";

export const createContextualize = <
  S extends any = unknown,
  Actions extends Action<ContextualizeState<S>> = Action<ContextualizeState<S>>
>(
  extraReducer?: Reducer<ContextualizeState<S> | undefined, Actions>
): Contextualize<ContextualizeState<S>, Actions> => {
  type State = ContextualizeState<S>;
  type InnerAction = ContextualizeInnerAction<State>;

  const getState: ContextualizeReducer<State> = (state, action) => {
    switch (action.type) {
      case "set": {
        return action.payload;
      }
      default: {
        return state;
      }
    }
  };

  const $reducer: ContextualizeReducer<State, Actions> = (state, action) => {
    const extraState = extraReducer?.(state, action as Actions) ?? state;
    const $state =
      extraState === state
        ? getState(state, action as Required<InnerAction>)
        : extraState;

    if ("onResolve" in action && state !== $state) action.onResolve($state);
    return $state;
  };

  type Callback = (state: State) => void;
  type ContextState = ContextualizeContextState<State, Actions>;

  const context = React.createContext<ContextState>({
    getState: missingProviderFallback,
    addListener: missingProviderFallback,
    dispatch: missingProviderFallback,
  });

  type ProviderProps = { initialState?: State };
  const Provider = ({
    children,
    initialState,
  }: React.PropsWithChildren<ProviderProps>) => {
    const [state, dispatch] = useReducer<ContextualizeReducer<State, Actions>>(
      $reducer,
      initialState
    );

    const asyncDispatch = useRef(
      (action: Actions | InnerAction) =>
        new Promise<State>((resolve) => {
          dispatch({
            ...action,
            onResolve: (state) => {
              action.onResolve?.(state);
              resolve(state);
            },
          });
        })
    );

    useEffect(() => {
      asyncDispatch.current({ type: "set", payload: initialState });
    }, [initialState]);

    const $state = useRef(state);
    $state.current = state;

    const $listeners = useRef<Array<Callback>>([]);
    const $addListener = useRef((callback: Callback) => {
      const index = $listeners.current.push(callback);
      return () => {
        $listeners.current.splice(index, 1);
      };
    });
    const $getState = useRef(() => $state.current);
    useEffect(() => {
      $listeners.current.forEach((listener) => {
        listener(state);
      });
    }, [state]);

    const $contextValue = useRef<ContextState>({
      addListener: $addListener.current,
      getState: $getState.current,
      dispatch: asyncDispatch.current,
    });

    return (
      <context.Provider value={$contextValue.current}>
        {children}
      </context.Provider>
    );
  };

  function useContextSelector(
    selector?: (state: State) => any,
    deps?: Array<unknown>
  ) {
    const $selector = useMemo(
      () => selector ?? ((state: State) => state),
      deps
    );
    const { addListener, getState } = useContext(context);
    const [value, setValue] = useState<ReturnType<typeof $selector>>(
      $selector(getState())
    );
    useEffect(() => {
      setValue($selector(getState()));
      const unsubscribe = addListener((state) => {
        setValue($selector(state));
      });
      return unsubscribe;
    }, [$selector, addListener, getState]);

    return value;
  }

  function useContextDispatch() {
    const { dispatch } = useContext(context);
    return dispatch;
  }

  return {
    context,
    Provider,
    useContextSelector,
    useContextDispatch,
  };
};
