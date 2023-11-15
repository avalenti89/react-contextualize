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

export type Action<State> = {
  type: string;
  payload: any;
  onResolve?: (state: State) => void;
};

export const createContextualize = <
  State extends any = unknown,
  Actions extends Action<State> = Action<State>
>(
  extraReducer?: Reducer<State, Actions>
) => {
  type InnerAction = {
    type: "set";
    payload: State;
    onResolve?: (state: State) => void;
  };
  const getState: Reducer<State, InnerAction> = (state, action) => {
    switch (action.type) {
      case "set": {
        return action.payload;
      }
      default: {
        return state;
      }
    }
  };

  const $reducer: Reducer<State, Actions | InnerAction> = (state, action) => {
    const extraState = extraReducer?.(state, action as Actions) ?? state;
    const $state =
      extraState === state
        ? getState(state, action as InnerAction)
        : extraState;

    if ("onResolve" in action && state !== $state) action.onResolve?.($state);
    return $state;
  };

  type Callback = (state: State) => void;
  type ContextState = {
    getState: () => State;
    addListener: (callback: Callback) => () => void;
    dispatch: React.Dispatch<Actions | InnerAction>;
  };
  const context = React.createContext<ContextState>({
    getState: missingProviderFallback,
    addListener: missingProviderFallback,
    dispatch: missingProviderFallback,
  });

  type ProviderProps = { initialState: State };
  const Provider = ({
    children,
    initialState,
  }: React.PropsWithChildren<ProviderProps>) => {
    const [state, dispatch] = useReducer<typeof $reducer>(
      $reducer,
      initialState
    );
    useEffect(() => {
      dispatch({ type: "set", payload: initialState });
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
      dispatch,
    });

    return (
      <context.Provider value={$contextValue.current}>
        {children}
      </context.Provider>
    );
  };

  function useContextSelector<Selector extends (state: State) => unknown>(
    selector: Selector,
    deps: Array<unknown>
  ): ReturnType<Selector>;
  function useContextSelector(): State;
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
