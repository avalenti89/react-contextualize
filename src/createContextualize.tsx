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
  ContextualizeProvider,
  ContextualizeReducer,
} from "./contextualize.types";
import { isEqual } from "lodash";

export const createContextualize = <
  State extends any = unknown,
  Actions extends Action<State> = Action<State>
>(
  extraReducer?: Reducer<State, Actions>
): Contextualize<State, Actions> => {
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

  const Provider: ContextualizeProvider<State> = ({
    children,
    initialState,
  }) => {
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

    const $initialState = useRef(initialState);

    useEffect(() => {
      if (isEqual($initialState.current, initialState)) return;
      asyncDispatch.current({ type: "set", payload: initialState }).then(() => {
        $initialState.current = initialState;
      });
    }, [initialState]);

    const $state = useRef(state);
    $state.current = state;

    const $listeners = useRef<Array<Callback>>([]);
    const $addListener = useRef((callback: Callback) => {
      const index = $listeners.current.push(callback);
      // callback($state.current);
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
      const unsubscribe = addListener((state) => {
        setValue((prev: ReturnType<typeof $selector>) => {
          const $value = $selector(state);
          if (isEqual(prev, $value)) return prev;
          return $value;
        });
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
    reducer: $reducer,
    context,
    Provider,
    useContextSelector,
    useContextDispatch,
  };
};
