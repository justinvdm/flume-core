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
    transform: RawSequence
  };

  type Def = InputDef | TransformDef;

  type TransformInitFn = () => any;

  type TransformDefFn = (Def | Def[]) => TransformDef;

  type Msg = {
    __flumeType: 'msg',
    type: string,
    value: any
  };

  type List = {
    __flumeType: 'list',
    msgs: Msg[]
  };

  type Task = {
    msg: Msg,
    source: InputDef,
    parent: Def,
    end: Function
  }
;
  type Graph = {
    inputs: InputNode[]
  };

  type NodeType<Def, Child, State, Methods> = {
    def: Def,
    child: ?Child,
    state: State,
    parentIndex: number,
    methods: Methods
  };

  type InputNode = NodeType<InputDef, TransformNode, null, null>;
  type TransformNode = NodeType<TransformDef, TransformNode, TransformState, Object>;
  type Node = InputNode | TransformNode;

  type TransformState = {
    tasks: Task[],
    currentTask: ?Task,
    data: any
  };

  type TransformResult = [any, any];

  type TaskRunner = Task => void;
  
  type RawSequenceStep = Function | [?Function, ?Function];

  type RawSequence = RawSequenceStep[] | Function;

  type SequenceStep = {
    onSuccess: Function,
    onFailure: Function
  };
  */

  var isArray = Array.isArray;

  function input()/*:InputDef*/ {
    return {
      type: 'input',
      parents: null,
      description: null
    };
  }

  function transform(init/*:TransformInitFn*/, transform/*:RawSequence*/)/*:TransformDefFn*/ {
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
    return transform(retNull, [
      retValue,
      seq(fn),
      retStateless
    ]);
  }

  function retValue(_/*:**/, v/*:**/)/*:**/ {
    return v;
  }

  function retStateless(v) {
    return [null, v];
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

  function dispatch(graph/*:Graph*/, source/*:InputDef*/, value/*:any*/, end/*:?Function*/)/*:Graph*/ {
    var inputs = findInputs(graph, source);
    var n = inputs.length;
    var i = -1;
    var tasks;
    var input;

    end = end
      ? callOnNth(n, end)
      : identity;

    while (++i < n) {
      input = inputs[i];
      tasks = createTasks(source, input.def, value, end);
      if (input.child) processTasks(input.child, tasks);
    }

    return graph;
  }

  function findInputs(graph/*:Graph*/, def/*:InputDef*/)/*:InputNode[]*/ {
    var inputs = graph.inputs;
    var n = inputs.length;
    var i = -1;
    var input;
    var targets = [];

    while (++i < n) {
      input = inputs[i];
      if (input.def === def && input.child) targets.push(input);
    }

    return targets;
  }

  function createInputNode(def/*:InputDef*/, child/*:?TransformNode*/, parentIndex/*:number*/)/*:InputNode*/ {
    return {
      def: def,
      child: child,
      parentIndex: parentIndex,
      methods: null,
      state: null
    };
  }

  function createTransformNode(def/*:TransformDef*/, child/*:?TransformNode*/, parentIndex/*:number*/)/*:TransformNode*/ {
    var node = {
      def: def,
      child: child,
      parentIndex: parentIndex,
      methods: {},
      state: {
        tasks: [],
        currentTask: null,
        data: def.description.init()
      }
    };

    node.methods.run = createTaskRunner(node);
    return node;
  }

  function isOfType(type/*:string*/, obj/*:any*/) {
    return obj && obj.__flumeType === type;
  }

  function msg(type/*:string*/, obj/*:any*/)/*Msg*/ {
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

  function createTask(source/*:InputDef*/, parent/*:Def*/, msg/*:Msg*/, end/*:Function*/)/*:Task*/ {
    return {
      source: source,
      parent: parent,
      msg: msg,
      end: end
    };
  }

  function createTasks(source/*:InputDef*/, parent/*:Def*/, value/*:any*/, end/*:Function*/)/*:Task[]*/ {
    if (!isOfType('list', value)) return [
      createTask(source, parent, valueMsg(value), end)
    ];

    var msgs = value.msgs;
    var n = msgs.length;
    var i = -1;
    var tasks = [];
    while (++i < n) tasks.push(createTask(source, parent, msgs[i], end));

    return tasks;
  }

  function castArray(v/*:any*/)/*:any[]*/ {
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
    var state = node.state;
    var def = node.def;
    var description = def.description;
    var msgType = description.msgType;
    var transform = seq(description.transform);

    var run = seq([
      begin,
      [onSuccess, errorMsg],
      end
    ]);

    return function taskRunnerFn(task/*:Task*/) {
      var msg = task.msg;
      if (msg.type === msgType) run(task);
      else next(task, msg);
    };

    function begin(task/*:Task*/) {
      state.currentTask = task;
      return transform(state.data, task.msg.value);
    }

    function end(res/*:any*/) {
      var task = state.currentTask;
      state.currentTask = null;
      if (task) next(task, res);
    }

    function onSuccess(res/*:TransformResult*/) {
      state.data = res[0];
      return res[1];
    }

    function next(task/*:Task*/, value/*:any*/) {
      if (node.child) {
        processTasks(node.child, createTasks(task.source, def, value, task.end));
      }
      else {
        task.end();
      }

      runNextTask(node);
    }
  }

  function pipe(v/*:any*/, fns/*:Function | Function[]*/)/*:any*/ {
    fns = castArray(fns);
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

    return function sequenceFn() {
      var i = -1;
      var p = new Thenable(false, arguments);
      var step;

      while (++i < n) {
        step = steps[i];
        p = p.then(step.onSuccess, step.onFailure);
      }

      return p;
    };
  }

  function spread(fn/*:Function*/)/*:Function*/ {
    return function spreadFn(args/*:any[]*/) {
      if (args.length === 1) return fn(args[0]);
      if (args.length === 0) return fn();
      return fn.apply(null, args);
    }
  }

  function normalizeSequenceStep(step/*:RawSequenceStep*/, i/*:number*/)/*:SequenceStep*/ {
    var onSuccess;
    var onFailure;

    if (typeof step == 'function') onSuccess = step;
    else {
      onSuccess = step[0];
      onFailure = step[1];
    }

    onSuccess = onSuccess || identity;
    onFailure = onFailure || throwError;

    // first function should take in multiple args
    if (i === 0) onSuccess = spread(onSuccess);

    return {
      onSuccess: onSuccess,
      onFailure: onFailure
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
        : onSuccess(v))
    }
    catch (e) {
      return new Thenable(true, e);
    }
  };

  function callOnNth(n/*:number*/, fn/*:Function*/)/*:Function*/ {
    var i = 1;

    return function callOnNthFn() {
      if (++i > n) fn();
    };
  }

  function append(arr, values) {
    var i = -1;
    var n = values.length;
    while (++i < n) arr.push(values[i]);
    return arr;
  }

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
    exports.msg = msg;
    exports.list = list;
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
      seq: seq,
      msg: msg,
      list: list
    };
  }
});
