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
    this.queue = thenable(null);
  }

  process(msg) {
    return this.queue = this.queue
      .then(() => this.def._process(this.state, msg, this.parentIndex))
      .then(resolveSync)
      .then(([newState, newMsg]) => {
        // TODO validate that an array is returned
        this.state = newState;
        return newMsg;
      });
  }
}


class Graph {
  constructor(inputs) {
    this.inputs = inputs;
  }

  dispatch(targetInput, msg) {
    // note: we intentionally do not return `process`'s result, it could be our
    // thenable implementation rather than a promise, and we shouldn't be
    // exposing this as part of the api. unhandled rejections shouldn't be an
    // issue here, provided we handle them appropriately in `process`
    for (const [input, node] of this.inputs) {
      if (input === targetInput) process(node, msg);
    }

    return this;
  }
}


function process(node, msg) {
  // TODO actual error handling
  return node.process(msg)
    .then(res => node.child && process(node.child, res));
}


function create(tail) {
  const inputs = [];
  const stack = [new Node(tail, null, 0)];

  let node;

  while ((node = stack.pop())) {
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
}


function maybeAsync(fn) {
  return (...args) => {
    try {
      const v = fn(...args);
      return thenable(v);
    } catch (e) {
      return thenableError(e);
    }
  };
}


function thenable(v) {
  return !(v || 0).then
    ? thenableValue(v)
    : v;
}


function thenableValue(v) {
  return {then: maybeAsync(resolveFn => resolveFn(v))};
}


function thenableError(e) {
  return {then: maybeAsync((_, rejectFn = thrower) => rejectFn(e))};
}


function thrower(e) {
  throw e;
}


function resolveSync(values) {
  if (!Array.isArray(values)) return thenable(values);
  const res = [];
  const n = values.length;
  let i = -1;
  let j = -1;
  let p = thenable(null);

  while (++i < n) p = p.then(call);
  return p.then(() => res);

  function call() {
    return thenable(values[++j]).then(push);
  }

  function push(v) {
    res.push(v);
  }
}


module.exports = {
  create,
  input,
  transform
};
