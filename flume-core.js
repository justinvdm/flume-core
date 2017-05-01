;(function(root, factory) {
  if (typeof root.define === 'function' && root.define.amd) root.define(factory);
  else if (typeof exports === 'object') factory(true);
  else root.flume = factory();
})(this, function(cjs) {
  // api

  var nil = message('flume:nil', null);


  function input() {
    return new InputDef();
  }


  function create(defs) {
    var self = {};
    self.dispatch = dispatch;
    self.inputs = buildGraph(self, defs);

    return self;

    function dispatch(src, msgs, done) {
      var nodes = inputsOf(self.inputs, src);
      var n = nodes.length;
      var i = -1;

      done = callOnNth(n, done || noop);
      while (++i < n) nodes[i].handle(msgs, done);

      return self;
    }
  }


  function message(type, v) {
    return new Msg(type, v);
  }


  function except(fn) {
    return trap({'flume:error': fn});
  }


  function trap(transform) {
    return {
      transform: conj({'*': trapFallbackMsgHandler}, transform)
    };
  }


  // types

  function Msg(type, value) {
    this.type = type;
    this.value = value;
  }


  function InputDef() {
    this.defType = 'input';
  }


  function TransformDef(opts) {
    this.defType = 'transform';
    this.init = ensure(opts.init, noop);
    this.transform = opts.transform;
  }


  function Node(graph, def, child, index) {
    this.graph = graph;
    this.def = def;
    this.child = child;
    this.index = index;
    this.handle = createHandler(this);
  }


  // graph building

  function buildGraph(graph, defs, child, index) {
    var i = defs.length - 1;
    if (i < 0) return [];

    // tail
    if (i) child = new Node(graph, createTransformDef(defs[i]), child, index);
    while (--i > 0) child = new Node(graph, createTransformDef(defs[i]), child, 0);

    return buildGraphHead(graph, defs[0], child);
  }


  function buildGraphHead(graph, defs, child) {
    defs = castArray(defs);

    var inputs = [];
    var i = -1;
    var def;
    var n = defs.length;

    while (++i < n) {
      def = defs[i];

      if (Array.isArray(def)) {
        inputs.push.apply(inputs, buildGraph(graph, def, child, i));
      } else if (def instanceof InputDef) {
        inputs.push(new Node(graph, def, child, i));
      } else {
        throw new Error("Expected input or array but got " + typeOf(def));
      }
    }

    return inputs;
  }


  function createTransformDef(obj) {
    if (typeof obj === 'function') {
      obj = {
        transform: {'flume:value': obj}
      };
    }
    else if (typeof (obj || 0).transform === 'function') {
      obj = conj(obj, {
        transform: {'flume:value': obj.transform}
      });
    }
    else if (typeOf((obj || 0).transform) !== 'object') {
      throw new Error(
        "Expected function or object matching transform shape but got " +
        typeOf(obj));
    }

    return new TransformDef(obj);
  }


  // message transforming

  function trapFallbackMsgHandler(state, v) {
    return {state: v};
  }


  function createHandler(node) {
    return {
      input: createInputHandler,
      transform: createTransformHandler
    }[node.def.defType](node);
  }


  function createInputHandler(node) {
    return function handle(msg, end) {
      node.child.handle([msg], node, node, end);
    };
  }


  function createTransformHandler(node) {
    var queue = [];
    var isBusy = false;
    var task = null;
    var state = node.def.init();
    var transformAsync = maybeAsync(transform);

    return function handle(msgs, parent, source, end) {
      msgs = msgs.map(castMessage)
      var i = -1;
      var n = msgs.length - 1;

      var taskDefaults = {
        source: source,
        parent: parent,
      };

      while (++i < n) schedule(conj(taskDefaults, {
        msg: msgs[i],
        end: noop
      }));

      if (n > -1) schedule(conj(taskDefaults, {
        msg: msgs[n],
        end: end
      }));
    };

    function schedule(task) {
      queue.push(task);
      if (!isBusy) next();
    }

    function next() {
      task = queue.shift();
      if (task) run();
    }

    function run() {
      isBusy = true;

      return transformAsync()
        .then(resolveSeq)
        .then(success, failure);
    }

    function transform() {
      var fns = node.def.transform;
      var fn = fns[task.msg.type] || fns['*'];
      return !fn
        ? {value: task.msg}
        : fn(state, task.msg.value, {
          source: task.source.def,
          parent: task.parent.def,
          dispatch: node.graph.dispatch
        });
    }

    function done(msgs) {
      var currTask = task;
      isBusy = false;
      task = null;

      if (node.child) node.child.handle(msgs, node, currTask.source, currTask.end);
      else currTask.end();

      next();
    }

    function success(res) {
      res = normalizeResult(state, res);
      state = res.state;
      done(res.values);
    }

    function failure(e) {
      if (!node.child) throw new UnhandledError(e);
      done([message('flume:error', e)]);
    }
  }


  // utils

  function inputsOf(inputs, def) {
    var res = [];
    var n = inputs.length;
    var i = -1;
    var input;

    while (++i < n) {
      input = inputs[i];
      if (input.def === def) res.push(input);
    }

    return res;
  }


  function conj() {
    var res = {};
    var objects = Array.prototype.slice.call(arguments);

    var i = -1;
    var n = objects.length;
    var obj;

    while (++i < n) {
      obj = objects[i];
      for (var k in obj) if (obj.hasOwnProperty(k)) res[k] = obj[k]
    }

    return res;
  }


  function noop() {
    return null;
  }


  function ensure(v, defaultVal) {
    return typeof v === 'undefined'
      ? defaultVal
      : v;
  }


  function identity(v) {
    return v;
  }


  function throwError(e) {
    throw e;
  }


  function castMessage(v) {
    return !(v instanceof Msg)
      ? message('flume:value', v)
      : v;
  }


  function normalizeResult(state, raw) {
    var hasState = raw.hasOwnProperty('state');
    var values;

    if (raw.hasOwnProperty('value')) values = [raw.value];
    else if (raw.hasOwnProperty('values')) values = raw.values;
    else if (hasState) values = [raw.state];

    return {
      values: values,
      state: hasState
        ? raw.state
        : state
    };
  }


  function castArray(v) {
    return !Array.isArray(v)
      ? [v]
      : v;
  }


  function typeOf(v) {
    return v !== null
      ? typeof v
      : 'null';
  }


  function callOnNth(n, fn) {
    var i = 0;

    return function onNthFn() {
      if (++i >= n) fn.apply(null, arguments);
    };
  }


  function maybeAsync(fn) {
    return function maybeAsyncFn() {
      try {
        var v = fn.apply(this, arguments);
        return castThenable(v);
      } catch (e) {
        if (e instanceof UnhandledError) throw e.error;
        return thenableError(e);
      }
    }
  }


  function castThenable(v) {
    return !isThenable(v)
      ? thenableValue(v)
      : v;
  }


  function thenableValue(v) {
    return new Thenable(v, false);
  }


  function thenableError(e) {
    return new Thenable(e, true);
  }


  function resolveSeq(values) {
    return Array.isArray(values) && values.filter(isThenable).length > 0
      ? resolveThenablesSeq(values)
      : castThenable(values);
  }


  function resolveThenablesSeq(values) {
    var res = [];
    var n = values.length;
    var i = -1;
    var j = -1;
    var p = thenableValue(null);

    while (++i < n) p = p.then(call);
    return p.then(done);

    function call() {
      return castThenable(values[++j]).then(push);
    }

    function push(v) {
      res.push(v);
    }

    function done() {
      return res;
    }
  }


  function isThenable(v) {
    return !!(v || 0).then;
  }


  function UnhandledError(error) {
    this.error = error;
  }


  function Thenable(value, isFailure) {
    this.value = value;
    this.isFailure = isFailure;
  }


  Thenable.prototype.then = maybeAsync(function then(successFn, failureFn) {
    if (this.isFailure) return (failureFn || throwError).call(this, this.value);
    else return (successFn || identity).call(this, this.value);
  });


  if (cjs)
    module.exports = {
      create: create,
      input: input,
      message: message,
      trap: trap,
      except: except,
      nil: nil,
      conj: conj,
      maybeAsync: maybeAsync,
      resolveSeq: resolveSeq
    }
  else
    return {
      create: create,
      input: input,
      message: message,
      trap: trap,
      except: except,
      nil: nil,
      conj: conj,
      maybeAsync: maybeAsync,
      castThenable: castThenable,
      resolveSeq: resolveSeq
    };
});
