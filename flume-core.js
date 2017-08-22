// @flow
;(function(root, factory) {
  if (typeof root.define === 'function' && root.define.amd)
    root.define(function() { return factory({}) });
  else if (typeof exports === 'object')
    factory(exports);
  else
    (root/*:any*/).flume = factory({});
})(this || 0, function(exports) {
  var nil = msg('__nil');
  var isArray = Array.isArray;

  function input/*::<V>*/()/*:Input<V>*/ {
    def.id = genUid();
    def.type = 'input';
    def.parents = null;
    def.description = null;

    function def(value/*:V*/)/*:InputValue<V>*/ {
      return {
        source: def,
        value: value
      };
    }

    return def;
  }

  function transform(init/*:TransformInitFn*/, transform/*:RawSequence*/)/*:TransformFn*/ {
    return function transformFn(parents/*:**/)/*:**/ {
      // $FlowFixMe
      return {
        id: genUid(),
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

  function reduce(initValFn/*:Function*/, fn/*:Function*/)/*:TransformFn*/ {
    return transform(initFn, [reduceFn, retTupleVV]);

    function initFn() {
      return initValFn();
    }

    function reduceFn(state/*:any*/, v/*:any*/) {
      return fn(state, v);
    }
  }

  function map(fn/*:Function*/)/*:TransformFn*/ {
    return transform(retNull, [mapFn, retTupleNullV]);

    function mapFn(_/*:any*/, v/*:any*/) {
      return fn(v);
    }
  }

  function filter(fn/*:Function*/)/*:TransformFn*/ {
    return map(branch(fn, identity, retNil));
  }

  function trap(msgType/*:string*/, fn/*:TransformFn*/)/*:TransformFn*/ {
    return function exceptFn(parents/*:**/)/*:**/ {
      var def = fn(parents);

      return conj(def, {
        description: conj(def.description, {msgType: msgType})
      });
    };
  }

  function except(fn/*:TransformFn*/)/*:TransformFn*/ {
    return trap('__error', fn);
  }

  function create(obj/*:Def | Def[]*/) {
    if (obj.type !== 'transform') obj = map(identity)(obj);
    return buildGraph(((obj/*:any*/)/*:Transform*/));
  }

  function buildGraph(tailDef/*:Transform*/)/*:Graph*/ {
    var inputs = {}
    var node = createTransformNode(tailDef, null, 0);
    var transforms = [node];
    var queue = [node];
    var i;
    var n;
    var parentNode;
    var parentDefs;
    var parentDef;

    while (node = queue.shift()) {
      parentDefs = node.def.parents;
      i = -1;
      n = parentDefs.length;

      while (++i < n) {
        parentDef = parentDefs[i];

        if (parentDef.type === 'input') {
          parentNode = createInputNode(parentDef, node, i);
          inputs[parentDef.id] = push(inputs[parentDef.id], parentNode);
        } else {
          parentNode = createTransformNode(parentDef, node, i);
          transforms.push(parentNode);
          queue.push(parentNode);
        }
      }
    }

    var graph = {inputs: inputs};
    initTransforms(graph, transforms);

    return graph;
  }

  function initTransforms(graph/*:Graph*/, transforms/*:TransformNode[]*/) {
    var n = transforms.length;
    var i = -1;
    var node;

    while (++i < n) {
      node = transforms[i];
      node.state.data = node.def.description.init(graph);
    }
  }

  function dispatch(graph/*:Graph*/, input/*:InputValue<*>*/, end/*:?Function*/)/*:Graph*/ {
    var source = input.source;
    var value = input.value;
    var inputs = graph.inputs[source.id] || [];
    var n = inputs.length;
    var i = -1;
    var tasks;
    var node;

    end = end
      ? callOnNth(n, end)
      : identity;

    while (++i < n) {
      node = inputs[i];

      tasks = createTasks(value, end, {
        graph: graph,
        source: source,
        parent: node.def,
        parentIndex: node.parentIndex,
      });

      if (node.child) processTasks(node.child, tasks);
    }

    return graph;
  }

  function createInputNode(def/*:Input<*>*/, child/*:?TransformNode*/, parentIndex/*:number*/)/*:InputNode*/ {
    return {
      def: def,
      child: child,
      parentIndex: parentIndex,
      methods: null,
      state: null
    };
  }

  function createTransformNode(def/*:Transform*/, child/*:?TransformNode*/, parentIndex/*:number*/)/*:TransformNode*/ {
    var node = {
      def: def,
      child: child,
      parentIndex: parentIndex,
      methods: {},
      state: {
        tasks: [],
        data: null,
        currentTask: null
      }
    };

    node.methods.run = createTaskRunner(node);
    return node;
  }

  function isOfType(type/*:string*/, obj/*:any*/) {
    return obj && obj.__flumeType === type;
  }

  function msg(type/*:string*/, obj/*:any*/)/*:Msg*/ {
    if (isOfType('msg', obj)) return obj;

    return {
      __flumeType: 'msg',
      type: type,
      value: obj
    };
  }

  function list(obj/*:any*/)/*:List*/ {
    if (isOfType('list', obj)) return obj;

    return {
      __flumeType: 'list',
      msgs: castArray(obj).map(valueMsg)
    };
  }

  function valueMsg(obj/*:any*/)/*:Msg*/ {
    return msg('__value', obj);
  }

  function errorMsg(e/*:any*/)/*:Msg*/ {
    return msg('__error', e);
  }

  function createTasks(value/*:any*/, end/*:Function*/, meta/*:TaskMetadata*/)/*:Task[]*/ {
    if (!isOfType('list', value)) return [{
      msg: valueMsg(value),
      end: end,
      meta: meta
    }];

    var msgs = value.msgs;
    var n = msgs.length;
    var i = -1;
    var tasks = [];

    while (++i < n) tasks.push({
      msg: msgs[i],
      end: end,
      meta: meta
    });

    return tasks;
  }

  function castArray/*::<V>*/(v/*:V*/)/*:V | [V]*/ {
    return !isArray(v)
      ? [v]
      : v;
  }

  function retNull()/*:null*/ {
    return null;
  }

  function processTasks(node/*:TransformNode*/, tasks/*:Task[]*/) {
    var state = node.state;
    append(state.tasks, tasks);
    runNextTask(node);
  }

  function runNextTask(node/*:TransformNode*/) {
    var state = node.state;
    if (state.currentTask) return;
    var task = state.tasks.shift();
    if (task) runTask(node, task);
  }

  function runTask(node, task) {
    node.methods.run(task);
  }

  function createTaskRunner(node/*:TransformNode*/)/*:TaskRunner*/ {
    var def = node.def;
    var child = node.child;
    var state = node.state;
    var parentIndex = node.parentIndex;
    var description = def.description;
    var msgType = description.msgType;
    var transform = description.transform;

    var parse = {
      success: success,
      failure: errorMsg
    };

    var run = seq([
      begin,
      parse,
      end
    ]);

    return function taskRunnerFn(task/*:Task*/) {
      var msg = task.msg;
      if (msg.type === msgType) run(task);
      else next(task, msg);
    };

    function begin(task/*:Task*/) {
      state.currentTask = task;
      // $FlowFixMe
      return transform(state.data, task.msg.value, task.meta);
    }

    function end(res/*:any*/) {
      var task = state.currentTask;
      state.currentTask = null;
      if (task) next(task, res);
    }

    function success(res/*:TransformResult*/) {
      state.data = res[0];
      return res[1];
    }

    function next(task/*:Task*/, value/*:any*/) {
      var meta = task.meta;

      if (child && value !== nil) {
        processTasks(child, createTasks(value, task.end, {
          graph: meta.graph,
          source: meta.source,
          parent: def,
          parentIndex: parentIndex
        }));
      }
      else {
        task.end();
      }

      runNextTask(node);
    }
  }

  /*::
  declare var pipe: PipeFn;
  */

  function pipe(v, fns) {
    if (!isArray(fns)) return fns(v);
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

  /*::
  declare var branch: BranchFn;
  */

  function branch(testFn, trueFn, falseFn) {
    return branchFn;

    function branchFn(v) {
      var res = testFn(v);
      return isThenable(res)
        ? res.then(partialRet(v))
        : ret(v, res);
    }

    function ret(v, res) {
      return res
        ? trueFn(v)
        : falseFn(v);
    }

    function partialRet(v) {
      return function(res) {
        return ret(v, res);
      };
    }
  }

  /*::
  declare var seq: SeqFn;
  */

  function seq(rawSteps) {
    var steps = [spread(rawSteps[0])].concat(rawSteps.slice(1))
      .map(parseStep);

    return function() {
      var n = steps.length;
      var i = -1;
      var v = createResult(false, arguments);
      while (++i < n) v = stepBind(v, steps[i]);
      return resolveResult(v);
    };
  }

  function parseStep(step) {
    var success;
    var failure;

    if (typeof step == 'function') success = step;
    else {
      success = step.success;
      failure = step.failure;
    }

    return {
      success: success || identity,
      failure: failure || throwError
    };
  }

  function stepBind(v, step) {
    var value = v.value;

    if (isThenable(value)) {
      value = value.then(step.success, step.failure);
      return createResult(false, value);
    }

    var fn = v.isError
      ? step.failure
      : step.success;

    try {
      return createResult(false, fn(value));
    } catch(e) {
      return createResult(true, e);
    }
  }

  function resolveResult(v) {
    if (v.isError) throw v.value;
    return v.value;
  }

  function isThenable(v) {
    return v && typeof v === 'object' && v.then;
  }

  function createResult(isError, v) {
    return {
      value: v,
      isError: isError
    };
  }

  /*::
  declare var spread: (<A,B>((...A) => B) => A => B);
  */

  function spread(fn) {
    return function spreadFn(args) {
      switch (args.length) {
        case 1: return fn(args[0]);
        case 2: return fn(args[0], args[1]);
        case 0: return fn();
        default: return fn.apply(null, args);
      }
    }
  }

  function callOnNth(n/*:number*/, fn/*:Function*/)/*:Function*/ {
    var i = 1;

    return function callOnNthFn() {
      if (++i > n) fn();
    };
  }

  function append(arr/*:any[]*/, values/*:any[]*/)/*:any[]*/ {
    var i = -1;
    var n = values.length;
    while (++i < n) arr.push(values[i]);
    return arr;
  }

  function push(arr/*:?any[]*/, v/*:any*/) {
    arr = arr || [];
    arr.push(v);
    return arr;
  }

  function retNil()/*:Nil*/ {
    return nil;
  }

  function retTupleVV/*::<V>*/(v/*:V*/)/*:[V, V]*/ {
    return [v, v];
  }

  function retTupleNullV/*::<V>*/(v/*:V*/)/*:[null, V]*/ {
    return [null, v];
  }

  function identity/*::<V>*/(v/*:V*/)/*:V*/ {
    return v;
  }

  function throwError(e) {
    throw e;
  }

  var uidCounter = 0;

  function genUid()/*:string*/ {
    return ++uidCounter + '';
  }

  exports.input = input;
  exports.pipe = pipe;
  exports.create = create;
  exports.dispatch = dispatch;
  exports.transform = transform;
  exports.map = map;
  exports.filter = filter;
  exports.reduce = reduce;
  exports.trap = trap;
  exports.except = except;
  exports.seq = seq;
  exports.branch = branch;
  exports.msg = msg;
  exports.list = list;
  exports.identity = identity;
});

/*::
import type {PipeFn} from './types/pipe';
import type {SeqFn} from './types/seq';
import type {BranchFn} from './types/branch';

export type Id = string;

export type Input<V> = {
  (V): InputValue<V>,
  id: Id,
  type: 'input'
};

type InputValue<V> = {
  source: Input<V>,
  value: V
};

type Transform = {
  id: Id,
  type: 'transform',
  parents: Def[],
  description: TransformDescription
};

type TransformDescription = {
  msgType: string,
  init: TransformInitFn,
  transform: RawSequence
};

type Def = Input<*> | Transform;

type TransformInitFn = Graph => any;

type TransformFn = (Def | Def[]) => Transform;

type MsgType<Type> = {
  __flumeType: 'msg',
  type: string,
  value: any
};

type Msg = MsgType<string>;
type Nil = MsgType<'__nil'>;

type List = {
  __flumeType: 'list',
  msgs: Msg[]
};

type TaskMetadata = {
  source: Input<*>,
  parent: Def,
  parentIndex: number,
  graph: Graph
};

type Task = {
  msg: Msg,
  end: Function,
  meta: TaskMetadata,
};

type Graph = {
  inputs: {
    [string]: InputNode[]
  }
};

type NodeType<Def, Child, State, Methods> = {
  def: Def,
  child: ?Child,
  state: State,
  parentIndex: number,
  methods: Methods
};

type InputNode = NodeType<Input<*>, TransformNode, null, null>;
type TransformNode = NodeType<Transform, TransformNode, TransformState, Object>;
type Node = InputNode | TransformNode;

type TransformState = {
  tasks: Task[],
  currentTask: ?Task,
  data: any
};

type TransformResult = [any, any];

type TaskRunner = Task => void;

type RawSequence = NestedRawSequence | NestedRawSequence[];

type NestedRawSequence =
  | RawSequence
  | SequenceStep;

type RawSequenceStep =
  | Function
  | {
    success?: Function,
    failure?: Function
  };

type SequenceStep = {
  success: Function,
  failure: Function
};

type MapType<V> = {[string]: V};

*/
