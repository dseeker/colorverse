const test = require('node:test');
const assert = require('node:assert/strict');

// Minimal DOM and storage stubs
class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.innerHTML = '';
    this.value = '';
    this.textContent = '';
    this.id = '';
    this._classSet = new Set();
    this.classList = {
      add: (...cls) => cls.forEach(c => this._classSet.add(c)),
      remove: (...cls) => cls.forEach(c => this._classSet.delete(c)),
      contains: cls => this._classSet.has(cls)
    };
  }

  appendChild(child) {
    this.children.push(child);
  }

  addEventListener() {}
}

function setupGlobals() {
  const documentStub = {
    elements: {},
    getElementById(id) { return this.elements[id] || null; },
    createElement(tag) { return new Element(tag); },
    querySelectorAll() { return []; },
    body: new Element('body'),
    addEventListener() {}
  };

  const localStorageStub = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = String(value); },
    removeItem(key) { delete this.store[key]; },
    clear() { this.store = {}; }
  };

  global.document = documentStub;
  global.localStorage = localStorageStub;
  global.window = { location: { hostname: 'localhost' }, addEventListener() {}, imageLoadQueue: undefined };
  global.showToast = () => {};
  global.reloadAllImages = () => {};
  global.setTimeout = fn => { fn(); return 0; };

  return { documentStub, localStorageStub };
}

function loadApp() {
  delete require.cache[require.resolve('../app.js')];
  return require('../app.js');
}

test('changeColoringStyle cancels downloads, clears cache, and reloads images', () => {
  setupGlobals();
  const app = loadApp();

  // Preload cache and set spies
  app.imageUrlCache.set('a', 'url');
  let cancelCount = 0;
  window.imageLoadQueue = { cancelAll: () => { cancelCount++; return 1; } };

  app.changeColoringStyle('bold-simple');

  assert.equal(app.getCurrentColoringStyle(), 'bold-simple');
  assert.equal(app.imageUrlCache.size, 0);
  assert.equal(cancelCount, 1);
});

