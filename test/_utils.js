const reject = e => Promise.reject(e);

const immediate = v => new Promise(resolve => setImmediate(() => resolve(v)));

exports.reject = reject;
exports.immediate = immediate;
