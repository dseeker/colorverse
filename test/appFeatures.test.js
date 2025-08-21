const test = require('node:test');
const assert = require('node:assert/strict');

// Simple DOM and storage stubs used for testing
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
  global.localStorage = localStorageStub;
  global.window = { location: { hostname: 'localhost' }, addEventListener() {}, imageLoadQueue: undefined };
  global.reloadAllImages = () => {};
  global.showToast = () => {};
  global.setTimeout = fn => { fn(); return 0; };

  return { documentStub, localStorageStub };
}

function loadApp() {
  delete require.cache[require.resolve('../app.js')];
  return require('../app.js');
}

test('applyTheme updates classes and storage', () => {
  const { documentStub, localStorageStub } = setupGlobals();

  const lightBtn = new Element('button');
  const darkBtn = new Element('button');
  const colorfulBtn = new Element('button');
  documentStub.elements['theme-light'] = lightBtn;
  documentStub.elements['theme-dark'] = darkBtn;
  documentStub.elements['theme-colorful'] = colorfulBtn;

  const carouselPrev = new Element('button');
  const carouselNext = new Element('button');
  documentStub.querySelectorAll = sel => {
    if (sel === '#carousel-prev, #carousel-next') {
      return [carouselPrev, carouselNext];
    }
    return [];
  };

  const app = loadApp();

  app.applyTheme('dark');

  assert(documentStub.body.classList.contains('theme-dark'));
  assert.equal(localStorageStub.getItem('colorverse-theme'), 'dark');
  assert(darkBtn.classList.contains('bg-white'));
  assert(!lightBtn.classList.contains('bg-white'));
  assert(carouselPrev.classList.contains('bg-gray-700'));
});

test('applyTheme falls back to light theme on invalid input', () => {
  const { documentStub, localStorageStub } = setupGlobals();
  const app = loadApp();

  app.applyTheme('unknown');

  assert(documentStub.body.classList.contains('theme-light'));
  assert.equal(localStorageStub.getItem('colorverse-theme'), 'light');
});

test('loadCachedImageUrls loads cache from storage', () => {
  const { localStorageStub } = setupGlobals();
  const app = loadApp();

  localStorageStub.setItem('colorverse-image-urls', JSON.stringify({ a: 'url1' }));
  const loaded = app.loadCachedImageUrls();

  assert.equal(loaded, true);
  assert.equal(app.imageUrlCache.get('a'), 'url1');
});

test('loadCachedImageUrls handles invalid JSON', () => {
  const { localStorageStub } = setupGlobals();
  const app = loadApp();

  localStorageStub.setItem('colorverse-image-urls', 'not-json');
  const loaded = app.loadCachedImageUrls();

  assert.equal(loaded, false);
  assert.equal(app.imageUrlCache.size, 0);
});

