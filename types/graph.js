// @flow
import type {InputDef} from './def';

export type Id = string;

export type NodeType<Def, Child, State, Methods> = {
  def: Def,
  child: ?Child,
  state: State,
  parentIndex: number,
  methods: Methods
};

export type InputNode<V> = NodeType<InputDef<V>, TransformNode, null, null>;
export type TransformNode<A,B,State> = NodeType<Transform, TransformNode, TransformState<State>, Object>;
export type ParentNode<V> = InputNode<V> | TransformNode<mixed, V>;

export type TransformState<State> = {
  tasks: Task[],
  currentTask: ?Task,
  data: State
};

export type TransformResult = [any, any];

export type Graph = {
  inputs: {
    [string]: InputNode<mixed>[]
  }
};
