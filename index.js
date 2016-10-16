class NodeDef {
  constructor() {
    this.parents = [];
  }

  pipe(opts) {
    return transform(Object.assign({parents: [this]}, opts));
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
    init = noop
  }) {
    super();
    this.parents = parents;
    this.initFn = init;
    this.transformFn = transform;
  }

  _init() {
    return this.initFn();
  }

  _process(state, msg, i) {
    return this.transformFn(state, msg, i);
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

    maybeAsync(() => this.def._process(this.state, msg, i))()
      .then(resolveSync)
      .then(success, done)
      .then(null, unhandledError);
  }
}


class Graph {
  constructor(inputs) {
    this.inputs = inputs;
  }

  dispatch(targetInput, msg, done = noop) {
    // note: we intentionally do not return `process`'s result, it could be our
    // thenable implementation rather than a promise, and we shouldn't be
    // exposing this as part of the api. unhandled rejections shouldn't be an
    // issue here, we should be handling rejections in `process`.
    done = callOnNth(this.inputs.length, done);

    for (const [input, node] of this.inputs) {
      if (input === targetInput) process(node, msg, 0, done);
    }

    return this;
  }
}


function process(node, msg, i, done) {
  // TODO actual error handling
  node.schedule(msg, i, (err, res) => {
    if (err) unhandledError(err);
    else if (node.child) process(node.child, res, node.parentIndex, done);
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


function noop() {
  return null;
}


function maybeAsync(fn) {
  return (...args) => {
    try {
      const v = fn(...args);
      return castThenable(v);
    } catch (e) {
      return thenableError(e);
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
  return {then: maybeAsync((_, failure = thrower) => failure(e))};
}


function thrower(e) {
  throw e;
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


function unhandledError(e) {
  console.error([
    'An unexpected error occured in flume. Sorry, this is mostly likely a bug ',
    'in flume. please check the known issues at ',
    'https://github.com/justinvdm/flume/issues and report the issue if it is ',
    'not yet reported.'
  ].join(''));

  console.error(e);
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
  transform
};
