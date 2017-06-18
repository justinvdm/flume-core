// @flow
;(function(root, factory) {
  if (typeof root.define === 'function' && root.define.amd) root.define(factory);
  else if (typeof exports === 'object') factory(true);
   // $FlowFixMe
  else root.flume = factory();
})(this, function(cjs) {
  /*::
  type DefType<Type, Parents, Description> = {|
    type: Type,
    parents: Parents,
    description: Description
  |};

  type InputDef = DefType<'input', null, null>;
  type TransformDef = DefType<'transform', Def[], TransformDescription>;

  type TransformDescription = {|
    msgType: string,
    init: TransformInitFn,
    transform: TransformFn
  |};

  type Def = InputDef | TransformDef;

  type TransformFn = (state: any, value: any) => any;

  type TransformInitFn = () => any;

  type Msg = {|
    type: string,
    value: any
  |};

  type Task = {|
    msg: Msg,
    source: InputDef,
    parent: Def
  |}

  type Graph = {|
    inputs: Node[]
  |};

  type NodeType<Def, Child, State> = {|
    def: Def,
    child: ?Child,
    state: State,
    parentIndex: number
  |};

  type InputNode = NodeType<InputDef, TransformNode, null>;
  type TransformNode = NodeType<TransformDef, TransformNode, TransformState>;
  type Node = InputNode | TransformNode;

  type TransformState = {|
    tasks: Task[],
    status: 'idle' | 'busy',
    data: any
  |}
  */

  function input()/*:InputDef*/ {
    return {
      type: 'input',
      parents: null,
      description: null
    };
  }

  function transform(init/*:TransformInitFn*/, transform/*:TransformFn*/) {
    return function transformFn(parents/*:Def | Def[]*/)/*:TransformDef*/ {
      return {
        parents: castArray(parents),
        type: 'transform',
        description: {
          init: init,
          msgType: '__value',
          transform: transform
        }
      };
    };
  }

  function map(fn/*:Function*/)/*:TransformFn*/ {
    return transform(retNull, mapFn);

    function mapFn(_, v) {
      return [null, fn(v)];
    }
  }

  function create(tailDef/*:TransformDef*/)/*:Graph*/ {
    var inputs = [];
    var queue = [createTransformNode(tailDef, null, 0)];
    var i;
    var n;
    var node;
    var parentDefs;
    var parentDef;

    while (node = queue.shift()) {
      parentDefs = node.def.parents;
      i = -1;
      n = parentDefs.length;

      while (++i < n) {
        parentDef = parentDefs[i];

        if (parentDef.type === 'input') {
          inputs.push(createInputNode(parentDef, node, i));
        } else {
          queue.push(createTransformNode(parentDef, node, i));
        }
      }
    }

    return {inputs: inputs};
  }

  function dispatch(graph/*:Graph*/, source/*:InputDef*/, value/*:any*/)/*:Graph*/ {
    var inputs = graph.inputs;
    var n = inputs.length;
    var i = -1;
    var input;

    while (++i < n) {
      input = inputs[i];

      if (input.def === source && input.child) {
        processTask(input.child, createTask(source, input.def, value));
      }
    }

    return graph;
  }

  function createInputNode(def/*:InputDef*/, child/*:?TransformNode*/, parentIndex/*:number*/)/*:InputNode*/ {
    return {
      def: def,
      child: child,
      parentIndex: parentIndex,
      state: null
    };
  }

  function createTransformNode(def/*:TransformDef*/, child/*:?TransformNode*/, parentIndex/*:number*/)/*:TransformNode*/ {
    return {
      def: def,
      child: child,
      parentIndex: parentIndex,
      state: {
        tasks: [],
        status: 'idle',
        data: def.description.init()
      }
    };
  }

  function createValueMsg(value/*:any*/)/*:Msg*/ {
    return {
      type: '__value',
      value: value
    };
  }

  function createTask(source/*:InputDef*/, parent/*:Def*/, value/*:any*/) {
    return {
      source: source,
      parent: parent,
      msg: createValueMsg(value)
    };
  }

  function castArray(v/*:any*/)/*:any[]*/ {
    return !Array.isArray(v)
      ? [v]
      : v;
  }

  function retNull()/*:null*/ {
    return null;
  }

  function processTask(node/*:TransformNode*/, task/*:Task*/) {
    var state = node.state;
    if (state.status === 'idle') runTask(node, task);
    else state.tasks.push(task);
  }

  function runNextTask(node/*:TransformNode*/) {
    var task = node.state.tasks.shift();
    if (task) runTask(node, task);
  }

  function runTask(node/*:TransformNode*/, task/*:Task*/) {
    var state = node.state;
    var description = node.def.description;
    state.status = 'busy';

    var res = description.transform(state.data, task.msg.value);

    state.data = res[0];
    state.status = 'idle';

    if (node.child) processTask(node.child, createTask(task.source, node.def, res[1]));
    runNextTask(node);
  }

  function pipe(v/*:any*/, fns/*:Function[]*/)/*:any*/ {
    var i = -1;
    var n = fns.length;

    while (++i < n) v = fns[i](v);

    return v;
  }

  if (cjs) {
    exports.pipe = pipe;
    exports.input = input;
    exports.create = create;
    exports.dispatch = dispatch;
    exports.transform = transform;
    exports.map = map;
  } else {
    return {
      input: input,
      pipe: pipe,
      create: create,
      dispatch: dispatch,
      transform: transform,
      map: map
    };
  }
});
