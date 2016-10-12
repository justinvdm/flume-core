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
  }

  process(msg) {
    const [newState, newMsg] = this.def._process(this.state, msg, this.parentIndex);
    this.state = newState;
    return newMsg;
  }
}


class Graph {
  constructor(inputs) {
    this.inputs = inputs;
  }

  dispatch(targetInput, msg) {
    for (const [input, node] of this.inputs) {
      if (input === targetInput) process(node, msg);
    }

    return this;
  }
}


function process(node, msg) {
  const newMsg = node.process(msg);
  if (node.child) process(node.child, newMsg);
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


module.exports = {
  create,
  input,
  transform
};
