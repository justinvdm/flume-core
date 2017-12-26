// @flow
export type InputDef<V> = {
  (V): InputValue<V>,
  id: Id,
  type: 'input'
};

export type TransformDef<State, A, B> = {
  id: Id,
  type: 'transform',
  parents: ParentDef<A>[],
  description: TransformDescription<State, A, B>
};

export type InputValue<V> = {
  source: InputDef<V>,
  value: V
};

export type TransformInitFn<State> = Graph => State;
export type TransformFn<State, A, B> = (state: State, a: A) => [State, B];

export type ParentDef<V> =
  | TransformDef<any, any, V>
  | InputDef<V>;

export type TransformDefFn<State,A,B>
  = (ParentDef<A>[]) => TransformDef<State, A, B>;

export type TransformDescription<State, A, B> = {
  msgType: string,
  init: TransformInitFn<State>,
  transform: TransformFn<State, A, B>
};
