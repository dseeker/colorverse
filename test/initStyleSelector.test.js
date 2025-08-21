const test = require('node:test');
const assert = require('node:assert/strict');

// Minimal DOM and localStorage stubs for testing
class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.innerHTML = '';
    this.value = '';
    this.textContent = '';
    this.className = '';
    this.classList = { add() {}, remove() {} };
  }

  appendChild(child) {
    this.children.push(child);
  }

  addEventListener() {}
}

const documentStub = {
  elements: {},
  getElementById(id) {
    return this.elements[id] || null;
  },
  createElement(tag) {
    return new Element(tag);
  },
  querySelectorAll() {
    return [];
  },
  body: new Element('body'),
  addEventListener() {}
};

const localStorageStub = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

global.document = documentStub;
global.window = {
  location: { hostname: 'localhost' },
  addEventListener() {},
  imageLoadQueue: undefined
};
global.localStorage = localStorageStub;

// Require application script after setting globals
const app = require('../app.js');

test('applies saved style on initialization', () => {
  // Prepare DOM and storage
  const select = new Element('select');
  documentStub.elements['style-selector'] = select;
  localStorageStub.setItem('colorverse-style', 'bold-simple');

  global.reloadAllImages = () => {};
  global.showToast = () => {};
  window.imageLoadQueue = { cancelAll: () => 0 };
  global.setTimeout = (fn) => { fn(); return 0; };

  app.imageUrlCache.set('x', 'y');

  app.initStyleSelector();

  assert.equal(select.value, 'bold-simple');
  assert.equal(app.getCurrentColoringStyle(), 'bold-simple');
  assert.equal(app.imageUrlCache.size, 0);
});

