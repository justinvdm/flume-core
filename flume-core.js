// @flow
;(function(root, factory) {
  if (typeof root.define === 'function' && root.define.amd) root.define(factory);
  else if (typeof exports === 'object') factory(true);
   // $FlowFixMe
  else root.flume = factory();
})(this, function(cjs) {
  /*::
  type DefType<Type, Parents, Description> = {
    type: Type,
    parents: Parents,
    description: Description
  };

  type InputDef = DefType<'input', null, null>;
  type TransformDef = DefType<'transform', Def[], TransformDescription>;

  type TransformDescription = {
    msgType: string,
    init: TransformInitFn,
    transform: TransformFn
  };

  type Def = InputDef | TransformDef;

  type TransformFn = (state: any, value: any) => any;

  type TransformInitFn = () => any;

  type TransformDefFn = (Def | Def[]) => TransformDef;

  type Msg = {
    __flumeType: 'msg',
    type: string,
    value: any
  };

  type Task = {
    msg: Msg,
    source: InputDef,
    parent: Def
  }

  type Graph = {
    inputs: Node[]
  };

  type NodeType<Def, Child, State> = {
    def: Def,
    child: ?Child,
    state: State,
    parentIndex: number
  };

  type InputNode = NodeType<InputDef, TransformNode, null>;
  type TransformNode = NodeType<TransformDef, TransformNode, TransformState>;
  type Node = InputNode | TransformNode;

  type TransformState = {
    tasks: Task[],
    status: 'idle' | 'busy',
    data: any
  };
  
  type RawSequenceStep = Function | [?Function, ?Function];

  type RawSequence = RawSequenceStep[] | Function;

  type SequenceStep = {
    onSuccess: Function,
    onFailure: Function
  };
  */

  function input()/*:InputDef*/ {
    return {
      type: 'input',
      parents: null,
      description: null
    };
  }

  function transform(init/*:TransformInitFn*/, transform/*:TransformFn*/)/*:TransformDefFn*/ {
    return function transformFn(parents/*:**/)/*:**/ {
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

  function map(fn/*:Function*/)/*:TransformDefFn*/ {
    return transform(retNull, mapFn);

    function mapFn(_, v) {
      return [null, fn(v)];
    }
  }

  function trap(msgType/*:string*/, fn/*:TransformDefFn*/)/*:TransformDefFn*/ {
    return function exceptFn(parents/*:**/)/*:**/ {
      var def = fn(parents);

      return conj(def, {
        description: conj(def.description, {msgType: msgType})
      });
    };
  }

  function except(fn/*:TransformDefFn*/)/*:TransformDefFn*/ {
    return trap('__error', fn);
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
        processTask(input.child, createTask(source, input.def, castValueMsg(value)));
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

  function createMsg(type/*:string*/, value/*:any*/) {
    return {
      __flumeType: 'msg',
      type: type,
      value: value
    };
  }

  function createValueMsg(value/*:any*/)/*:Msg*/ {
    return createMsg('__value', value);
  }

  function createErrorMsg(error/*:any*/)/*:Msg*/ {
    return createMsg('__error', error);
  }

  function castValueMsg(obj/*any*/)/*:Msg*/ {
    return (obj || 0).__flumeType !== 'msg'
      ? createValueMsg(obj)
      : obj;
  }

  function createTask(source/*:InputDef*/, parent/*:Def*/, msg/*:Msg*/) {
    return {
      source: source,
      parent: parent,
      msg: msg
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
    var msg = task.msg;
    var res;

    if (msg.type === description.msgType) {
      state.status = 'busy';

      try {
        res = description.transform(state.data, task.msg.value);
        state.data = res[0];
        msg = castValueMsg(res[1]);
      } catch(e) {
        msg = createErrorMsg(e);
      }

      state.status = 'idle';
    }

    if (node.child) processTask(node.child, createTask(task.source, node.def, msg));
    runNextTask(node);
  }

  function pipe(v/*:any*/, fns/*:Function[]*/)/*:any*/ {
    var i = -1;
    var n = fns.length;

    while (++i < n) v = fns[i](v);

    return v;
  }

  function conj(a/*:Object*/, b/*:Object*/)/*:Object*/ {
    var res = {};
    var k;
    for (k in a) if (a.hasOwnProperty(k)) res[k] = a[k];
    for (k in b) if (b.hasOwnProperty(k)) res[k] = b[k];
    return res;
  }

  function seq(sequence/*:RawSequence*/)/*:Function*/ {
    var steps = []
      .concat(sequence)
      .concat([[null, throwError]])
      .map(normalizeSequenceStep);

    var n = steps.length;

    return function sequenceFn(v/*:any*/) {
      var i = -1;
      var p = new Thenable(false, v);
      var step;

      while (++i < n) {
        step = steps[i];
        p = p.then(step.onSuccess, step.onFailure);
      }
    };
  }

  function normalizeSequenceStep(step/*:RawSequenceStep*/)/*:SequenceStep*/ {
    var onSuccess;
    var onFailure;

    if (typeof step == 'function') onSuccess = step;
    else {
      onSuccess = step[0];
      onFailure = step[1];
    }

    return {
      onSuccess: onSuccess || identity,
      onFailure: onFailure || throwError
    };
  }

  function Thenable(isError/*:boolean*/, v/*:any*/) {
    if ((v || 0).then) return v;
    this.isError = isError;
    this.v = v;
  }

  Thenable.prototype.then = function then(onSuccess/*:Function*/, onFailure/*:Function*/) {
    var v = this.v;

    try {
      return new Thenable(false, this.isError
        ? onFailure(v)
        : onSuccess(v));
    }
    catch (e) {
      return new Thenable(true, e);
    }
  };

  function throwError(e) {
    throw e;
  }

  function identity(v) {
    return v;
  }

  if (cjs) {
    exports.pipe = pipe;
    exports.input = input;
    exports.create = create;
    exports.dispatch = dispatch;
    exports.transform = transform;
    exports.map = map;
    exports.trap = trap;
    exports.except = except;
    exports.seq = seq;
  } else {
    return {
      input: input,
      pipe: pipe,
      create: create,
      dispatch: dispatch,
      transform: transform,
      map: map,
      trap: trap,
      except: except,
      sequence: seq
    };
  }
});
