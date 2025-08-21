const test = require('node:test');
const assert = require('node:assert/strict');

// Minimal DOM/storage stubs
class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this._classSet = new Set();
    this.classList = {
      add: (...cls) => cls.forEach(c => this._classSet.add(c)),
      remove: (...cls) => cls.forEach(c => this._classSet.delete(c)),
      contains: c => this._classSet.has(c)
    };
  }
  appendChild(child) { this.children.push(child); }
  addEventListener() {}
}

function setupGlobals() {
  global.document = {
    elements: {},
    getElementById(id) { return this.elements[id] || null; },
    createElement(tag) { return new Element(tag); },
    querySelectorAll() { return []; },
    body: new Element('body'),
    addEventListener() {}
  };
  global.localStorage = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k,v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
    clear() { this.store = {}; }
  };
  global.window = { location: { hostname: 'localhost', hash: '' }, addEventListener() {}, imageLoadQueue: undefined };
  global.navigator = { storage: { estimate: () => Promise.resolve({ usage:0, quota:100 }) } };
  global.showToast = () => {};
  global.setTimeout = fn => { fn(); return 0; };
}

function loadApp() {
  delete require.cache[require.resolve('../app.js')];
  return require('../app.js');
}

test('getOptimizedModelOrder skips failed preferred model', () => {
  setupGlobals();
  const app = loadApp();
  app.modelSuccessTracker.failedModels.add('mistral');
  const order = app.getOptimizedModelOrder('mistral');
  assert(order[0] !== 'mistral');
});

// Helper to create success response
function successResponse(content) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] })
  };
}

test('callAIAPI returns parsed JSON', async () => {
  setupGlobals();
  global.fetch = async () => successResponse('{"hello":"world"}');
  const app = loadApp();
  const data = await app.callAIAPI('prompt');
  assert.deepEqual(data, { hello: 'world' });
});

// Fallback test: first call fails, second succeeds
// Create failing then succeeding fetch

test('callAIAPI falls back to next model on failure', async () => {
  setupGlobals();
  let calls = 0;
  global.fetch = async () => {
    calls++;
    if (calls === 1) {
      return { ok: false, status: 500, text: async () => 'error' };
    }
    return successResponse('{"ok":true}');
  };
  const app = loadApp();
  const data = await app.callAIAPI('prompt');
  assert.deepEqual(data, { ok: true });
  assert.equal(calls, 2);
});
