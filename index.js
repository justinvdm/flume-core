class UnhandledError {
  constructor(error) {
    this.error = error;
  }
}


class Msg {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
}


class ValueMsgType {}
class ErrorMsgType {}


class NodeDef {
  constructor() {
    this.parents = [];
  }

  pipe(opts) {
    return transform(conj({parents: [this]}, opts));
  }

  create() {
    return create(this);
  }

  _init() {
    return null;
  }

  _process(state, msg) {
    return [state, msg];
  }
}


class InputDef extends NodeDef {
}


class TransformDef extends NodeDef {
  constructor({
    parents,
    transform,
    type = ValueMsgType,
    init = noop
  }) {
    super();
    this.msgType = type;
    this.parents = parents;
    this.initFn = init;
    this.transformFn = transform;
  }

  _init() {
    return this.initFn();
  }

  _process(state, msg, i) {
    return this.msgType === msg.type
      ? this.transformFn(state, msg.value, i)
      : [state, msg];
  }
}


class Node {
  constructor(def, child, parentIndex) {
    this.def = def;
    this.child = child;
    this.parentIndex = parentIndex;
    this.state = this.def._init();
    this.queue = [];
    this.isBusy = false;
  }

  schedule(...task) {
    if (this.isBusy) this.queue.push(task);
    else this.process(...task);
  }

  processNext() {
    const task = this.queue.shift();
    if (task) this.process(...task);
  }

  process(msg, i, done) {
    this.isBusy = true;

    const success = ([state, res]) => {
      // TODO validate that an array is returned
      this.state = state;
      this.isBusy = false;
      done(null, res);
      this.processNext();
    }

    const failure = e => {
      this.isBusy = false;
      done(e);
      this.processNext();
    };

    maybeAsync(() => this.def._process(this.state, msg, i))()
      .then(resolveSync)
      .then(success, failure)
      .then(null, unhandledError);
  }
}


class Graph {
  constructor(inputs) {
    this.inputs = inputs;
  }

  dispatch(targetInput, msg, done = noop) {
    done = callOnNth(this.inputs.length, done);

    for (const [input, node] of this.inputs) {
      if (input === targetInput) process(node, msg, 0, done);
    }

    return this;
  }
}


function process(node, msg, i, done) {
  msg = castMessage(msg);

  node.schedule(msg, i, (err, msg) => {
    if (err) msg = message(ErrorMsgType, err);

    if (node.child) process(node.child, msg, node.parentIndex, done);
    else if (err) throw err;
    else done();
  });
}


function create(tail) {
  const inputs = [];
  const stack = [new Node(tail, null, 0)];

  let node;

  while ((node = stack.shift())) {
    let i = 0;
    for (const parent of node.def.parents) stack.push(new Node(parent, node, i++));
    if (node.def instanceof InputDef) inputs.push([node.def, node]);
  }

  return new Graph(inputs);
}


function input() {
  return new InputDef();
}


function transform(...args) {
  return new TransformDef(...args);
}


function message(...args) {
  return new Msg(...args);
}


function except(obj) {
  return trap(ErrorMsgType, obj);
}


function trap(type, obj) {
  return conj(obj, {type});
}


function conj(...objects) {
  return Object.assign({}, ...objects);
}


function noop() {
  return null;
}


function castMessage(v) {
  return !(v instanceof Msg)
    ? message(ValueMsgType, v)
    : v;
}


function maybeAsync(fn) {
  return (...args) => {
    try {
      const v = fn(...args);
      return castThenable(v);
    } catch (e) {
      if (e instanceof UnhandledError) throw e.error;
      else return thenableError(e);
    }
  };
}


function castThenable(v) {
  return !(v || 0).then
    ? thenableValue(v)
    : v;
}


function thenableValue(v) {
  return {then: maybeAsync(success => success(v))};
}


function thenableError(e) {
  return {then: maybeAsync((_, failure = throwError) => failure(e))};
}


function throwError(e) {
  throw e;
}


function unhandledError(e) {
  throw new UnhandledError(e);
}


function resolveSync(values) {
  if (!Array.isArray(values)) return castThenable(values);
  const res = [];
  const n = values.length;
  let i = -1;
  let j = -1;
  let p = castThenable(null);

  while (++i < n) p = p.then(call);
  return p.then(() => res);

  function call() {
    return castThenable(values[++j]).then(push);
  }

  function push(v) {
    res.push(v);
  }
}


function callOnNth(n, fn) {
  let i = 0;

  return (...args) => {
    if (++i >= n) fn(...args);
  };
}


module.exports = {
  create,
  input,
  transform,
  message,
  except,
  trap
};
