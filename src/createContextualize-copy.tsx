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

export type Callback<State> = (state: State) => void;

export type Action<State> = {
  type: string;
  payload: any;
  onResolve?: Callback<State>;
};

export type ContextualizeInnerActions<State> = Action<State> & {
  type: "set";
  payload: State;
};

export type ContextualizeContextState<
  State,
  Actions extends Action<State> = ContextualizeInnerActions<State>
> = {
  getState: () => State;
  addListener: (callback: Callback<State>) => () => void;
  dispatch: React.Dispatch<Actions>;
};

export type ContextualizeProviderProps<State> = { initialState: State };

export type ContextualizeReturn<
  State,
  Actions extends Action<State> = ContextualizeInnerActions<State>
> = {
  context: React.Context<
    ContextualizeContextState<State, Actions | ContextualizeInnerActions<State>>
  >;
  Provider: React.ComponentType<
    React.PropsWithChildren<ContextualizeProviderProps<State>>
  >;
  useContextSelector: ReturnType<
    typeof createContextSelector<
      State,
      ContextualizeContextState<
        State,
        Actions | ContextualizeInnerActions<State>
      >
    >
  >;
  useContextDispatch: React.Dispatch<
    Actions | ContextualizeInnerActions<State>
  >;
};

export function createContextualize<State, Actions extends Action<State>>(
  extraReducer: Reducer<State, Actions>
): ContextualizeReturn<State, Actions>;
export function createContextualize<State>(
  extraReducer?: never
): ContextualizeReturn<State>;
export function createContextualize<
  State extends any = unknown,
  Actions extends Action<State> = Action<State>
>(extraReducer?: Reducer<State, Actions>): ContextualizeReturn<State, Actions> {
  type InnerAction = ContextualizeInnerActions<State>;
  type InnerCallback = Callback<State>;
  type InnerContextState = ContextualizeContextState<
    State,
    Actions | InnerAction
  >;
  type InnerProviderProps = ContextualizeProviderProps<State>;

  const getState = (state: State, action: InnerAction): State => {
    switch (action.type) {
      case "set": {
        return action.payload;
      }
      default: {
        return extraReducer?.(state, action as Actions) ?? state;
      }
    }
  };

  const $reducer: Reducer<State, Actions | InnerAction> = (state, action) => {
    const $state = getState(state, action as InnerAction);

    if ("onResolve" in action && state !== $state) action.onResolve?.($state);
    return $state;
  };

  const context = React.createContext<InnerContextState>({
    getState: missingProviderFallback,
    addListener: missingProviderFallback,
    dispatch: missingProviderFallback,
  });

  const Provider = ({
    children,
    initialState,
  }: React.PropsWithChildren<InnerProviderProps>) => {
    const [state, dispatch] = useReducer<typeof $reducer>(
      $reducer,
      initialState
    );
    useEffect(() => {
      dispatch({ type: "set", payload: initialState });
    }, [initialState]);

    const $state = useRef(state);
    $state.current = state;

    const $listeners = useRef<Array<InnerCallback>>([]);
    const $addListener = useRef((callback: InnerCallback) => {
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

    const $contextValue = useRef<InnerContextState>({
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

  const useContextSelector = createContextSelector<State, InnerContextState>(
    context
  );

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
}

function createContextSelector<
  State,
  ContextState extends ContextualizeContextState<State>
>(context: React.Context<ContextState>) {
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
  return useContextSelector;
}
