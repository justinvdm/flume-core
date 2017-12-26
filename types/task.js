// @flow
export type TaskMetadata<Source, Parent, Graph> = {
  source: Source,
  parent: Parent,
  parentIndex: number,
  graph: Graph
};

export type Task<Msg, TaskMetadata> = {
  msg: Msg,
  end: Function,
  meta: TaskMetadata,
};

export type TaskRunner = Task<mixed, mixed> => any;
