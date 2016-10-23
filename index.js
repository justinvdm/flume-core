// api

var nil = message(NilMsgType, null);


function input() {
  return new InputDef();
}


function create(defs) {
  var inputs = buildGraph(defs);
  var self = {dispatch: dispatch};
  return self;

  function dispatch(def, msgs, done) {
    done = done || noop;
    done = callOnNth(inputs.length, done);

    var n = inputs.length;
    var i = -1;
    var node;

    while (++i < n) {
      node = inputs[i];
      if (node.def === def) node.handle(msgs, done);
    }

    return this;
  }
}


function message(type, v) {
  return new Msg(type, v);
}


function batch(values) {
  return new Batch(values.map(castMessage));
}


function except(obj) {
  return trap(ErrorMsgType, obj);
}


function trap(type, obj) {
  return conj(castProcessorShape(obj), {type: type});
}


// types

function ValueMsgType() {}
function ErrorMsgType() {}
function NilMsgType() {}


function Msg(type, value) {
  this.type = type;
  this.value = value;
}


function Batch(messages) {
  this.messages = messages;
}


function InputDef() {
}


function ProcessorDef(opts) {
  opts = castProcessorShape(opts);
  this.type = ensure(opts.type, ValueMsgType);
  this.init = ensure(opts.init, noop);
  this.process = opts.process;
}


function Node(def, child, index) {
  this.def = def;
  this.child = child;
  this.index = index;
  this.handle = createHandler(this);
}


// graph building

function buildGraph(defs, child, index) {
  // TODO validate not empty
  var i = defs.length - 1;

  // tail
  if (i) child = new Node(new ProcessorDef(defs[i]), child, index);
  while (--i) child = new Node(new ProcessorDef(defs[i]), child, 0);

  return buildGraphHead(defs[0], child);
}


function buildGraphHead(defs, child) {
  defs = castArray(defs);

  var inputs = [];
  var i = -1;
  var def;
  var n = defs.length;

  while (++i < n) {
    def = defs[i];

    if (Array.isArray(def)) {
      // TODO check for empty array
      inputs.push.apply(inputs, buildGraph(def, child, i));
    } else if (def instanceof InputDef) {
      inputs.push(new Node(def, child, i));
    } else {
      // TODO throw error
    }
  }

  return inputs;
}


function createHandler(node) {
  return {
    InputDef: createInputHandler,
    ProcessorDef: createProcessorHandler
  }[node.def.constructor.name](node);
}


function createInputHandler(node) {
  return function handle(msgs, end) {
    node.child.handle(msgs, node, end);
  };
}


function createProcessorHandler(node) {
  var queue = [];
  var isBusy = false;
  var task = null;
  var state = node.def.init();
  var processAsync = maybeAsync(process);

  return function handle(msgs, parent, end) {
    msgs = castBatch(msgs).messages;

    var i = -1;
    var n = msgs.length - 1;

    while (++i < n) schedule({
      msg: msgs[i],
      parent: parent,
      end: noop
    });

    if (n > -1) schedule({
      msg: msgs[n],
      parent: parent,
      end: end
    });
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

    return processAsync()
      .then(resolveSeq)
      .then(success, failure)
      .then(done)
      .then(null, throwUnhandled);
  }

  function process() {
    return node.def.type === task.msg.type
      ? node.def.process(state, task.msg.value, task.parent.index)
      : [state, task.msg];
  }

  function done(msgs) {
    var end = task.end;

    isBusy = false;
    task = null;
    next();

    if (node.child) node.child.handle(msgs, node, end);
    else end();
  }

  function success(res) {
    if (Array.isArray(res)) {
      state = res[0];
      return res[1];
    }
    else {
      return nil;
    }
  }

  function failure(e) {
    if (!node.child) throw e;
    return message(ErrorMsgType, e);
  }
}


// utils


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


function castBatch(v) {
  return !(v instanceof Batch)
    ? batch([v])
    : v;
}


function castMessage(v) {
  return !(v instanceof Msg)
    ? message(ValueMsgType, v)
    : v;
}


function castArray(v) {
  return !Array.isArray(v)
    ? [v]
    : v;
}


function castProcessorShape(v) {
  return typeof v === 'function'
    ? {process: v}
    : v;
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


function throwUnhandled(e) {
  if (this instanceof Thenable) throw new UnhandledError(e);
  else throw e;
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


module.exports = {
  create: create,
  input: input,
  message: message,
  batch: batch,
  except: except,
  trap: trap,
  nil: nil
};
