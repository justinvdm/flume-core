// api

var nil = message(NilMsgType, null);


function input() {
  return new InputDef();
}


function create(defs) {
  return new Graph(buildGraph(defs));
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


Graph.prototype.dispatch = function dispatch(def, msgs, done) {
  done = done || noop;
  done = callOnNth(this.inputs.length, done);

  var inputs = this.inputs;
  var n = inputs.length;
  var i = -1;
  var node;

  while (++i < n) {
    node = inputs[i];
    if (node.def === def) receive(node.child, msgs, node.parentIndex, done);
  }

  return this;
};


// types

function ValueMsgType() {}
function ErrorMsgType() {}
function NilMsgType() {}


function UnhandledError(error) {
  this.error = error;
}


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
  this.type = ensure(opts.type, ValueMsgType);
  this.init = ensure(opts.init, noop);
  this.process = opts.process;
}


function InputNode(def, child, parentIndex) {
  this.def = def;
  this.child = child;
  this.parentIndex = parentIndex;
}


function ProcessorNode(def, child, parentIndex) {
  this.def = def;
  this.child = child;
  this.parentIndex = parentIndex;
  this.state = this.def.init();
  this.queue = [];
  this.isBusy = false;
}


function Graph(inputs) {
  this.inputs = inputs;
}


// graph building

function buildGraph(defs, child, parentIndex) {
  // TODO validate not empty
  var i = defs.length - 1;

  // tail
  if (i) child = createProcessorNode(defs[i], child, parentIndex);
  while (--i) child = createProcessorNode(defs[i], child, 0);

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
      inputs.push(new InputNode(def, child, i));
    } else {
      // TODO throw error
    }
  }

  return inputs;
}


function createProcessorNode(def, child, i) {
  // TODO validate def
  return new ProcessorNode(new ProcessorDef(castProcessorShape(def)), child, i);
}


// message processing

function schedule(node, task) {
  node.queue.push(task);
  if (!node.isBusy) processNext(node);
}


function processNext(node) {
  var task = node.queue.shift();
  if (task) process.apply(null, [node].concat(task));
}


function process(node, msg, i, done) {
  node.isBusy = true;

  maybeAsync(processFn)()
    .then(resolveSync)
    .then(success, failure)
    .then(null, unhandledError);

  function processFn() {
    return node.def.type === msg.type
      ? node.def.process(node.state, msg.value, i)
      : [node.state, msg];
  }

  function success(res) {
    res = !Array.isArray(res)
      ? [node.state, nil]
      : res;

    node.state = res[0];
    node.isBusy = false;
    done(null, res[1]);
    processNext(node);
  }

  function failure(e) {
    node.isBusy = false;
    done(e);
    processNext(node);
  }
}


function receive(node, msgs, parentIndex, end) {
  msgs = castBatch(msgs).messages;
  end = callOnNth(msgs.length, end);

  var i = -1;
  var n = msgs.length;
  while (++i < n) schedule(node, [msgs[i], parentIndex, done]);

  function done(err, res) {
    if (err) res = message(ErrorMsgType, err);
    if (node.child) receive(node.child, res, node.parentIndex, end);
    else if (err) throw err;
    else end();
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


function maybeAsync(fn) {
  return function maybeAsync() {
    try {
      var v = fn.apply(null, arguments);
      return castThenable(v);
    } catch (e) {
      if (e instanceof UnhandledError) throw e.error;
      else return thenableError(e);
    }
  }
}


function castThenable(v) {
  return !(v || 0).then
    ? thenableValue(v)
    : v;
}


function thenableValue(v) {
  return {then: maybeAsync(successFn)};

  function successFn(success) {
    return success(v);
  }
}


function thenableError(e) {
  return {then: maybeAsync(failureFn)};

  function failureFn(_, failure) {
    if (failure) failure(e);
    else throw e;
  }
}


function unhandledError(e) {
  throw new UnhandledError(e);
}


function resolveSync(values) {
  if (!Array.isArray(values)) return castThenable(values);
  var res = [];
  var n = values.length;
  var i = -1;
  var j = -1;
  var p = castThenable(null);

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


function callOnNth(n, fn) {
  var i = 0;

  return function onNthFn() {
    if (++i >= n) fn.apply(null, arguments);
  };
}


module.exports = {
  create: create,
  input: input,
  message: message,
  batch: batch,
  except: except,
  trap: trap,
  nil: nil
};
