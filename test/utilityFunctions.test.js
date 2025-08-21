const test = require('node:test');
const assert = require('node:assert/strict');

// Simple DOM and storage stubs for testing various utility functions
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
  global.window = { location: { hostname: 'localhost', hash: '' }, addEventListener() {}, imageLoadQueue: undefined };
  global.navigator = { storage: { estimate: () => Promise.resolve({ usage: 0, quota: 100 }) } };
  global.reloadAllImages = () => {};
  global.showToast = () => {};
  global.setTimeout = fn => { fn(); return 0; };

  return { documentStub, localStorageStub };
}

function loadApp() {
  delete require.cache[require.resolve('../app.js')];
  return require('../app.js');
}

test('getDynamicReferrer returns fixed domain', () => {
  setupGlobals();
  const app = loadApp();
  assert.equal(app.getDynamicReferrer(), 'dseeker.github.io');
});

test('getImageUrl caches generated URLs', () => {
  setupGlobals();
  const app = loadApp();
  const url1 = app.getImageUrl('test prompt', { seed: () => 123 });
  const url2 = app.getImageUrl('test prompt', { seed: () => 123 });
  assert.equal(url1, url2);
  assert.equal(app.imageUrlCache.size, 1);
  assert(url1.includes('referrer=dseeker.github.io'));
});

test('getCategoryIcon returns default icon when unknown', () => {
  setupGlobals();
  const app = loadApp();
  assert.equal(app.getCategoryIcon('animals'), 'fas fa-paw');
  assert.equal(app.getCategoryIcon('unknown'), 'fas fa-paint-brush');
});

test('getCurrentPageFromHash and getCurrentSortFromHash parse values', () => {
  setupGlobals();
  const app = loadApp();
  window.location.hash = '#category/test?page=3&sort=new';
  assert.equal(app.getCurrentPageFromHash(), 3);
  assert.equal(app.getCurrentSortFromHash(), 'new');
  window.location.hash = '#category/test';
  assert.equal(app.getCurrentPageFromHash(), 1);
  assert.equal(app.getCurrentSortFromHash(), 'popular');
});

test('getRandomPastelGradient returns predefined value', () => {
  setupGlobals();
  const app = loadApp();
  const gradient = app.getRandomPastelGradient();
  const gradients = [
    'from-pink-200 to-purple-200',
    'from-yellow-200 to-green-200',
    'from-blue-200 to-indigo-200',
    'from-red-200 to-yellow-200',
    'from-green-200 to-blue-200',
    'from-purple-200 to-pink-200',
    'from-indigo-200 to-purple-200',
    'from-yellow-200 to-orange-200',
    'from-lime-200 to-emerald-200',
    'from-cyan-200 to-sky-200'
  ];
  assert(gradients.includes(gradient));
});

test('saveToCache and loadFromCache handle data and validity', () => {
  const { localStorageStub } = setupGlobals();
  const app = loadApp();
  const data = {
    categories: {
      a: { items: { i: { title: 't', description: 'd' } } },
      b: { items: { i: { title: 't', description: 'd' } } },
      c: { items: { i: { title: 't', description: 'd' } } },
      d: { items: { i: { title: 't', description: 'd' } } },
      e: { items: { i: { title: 't', description: 'd' } } }
    }
  };
  assert.equal(app.saveToCache(data), true);
  const loaded = app.loadFromCache();
  assert.deepEqual(loaded, data);

  // Invalid JSON should clear cache
  localStorageStub.setItem(app.CACHE_KEY_SITE_DATA, 'not-json');
  assert.equal(app.loadFromCache(), null);
  assert.equal(localStorageStub.getItem(app.CACHE_KEY_SITE_DATA), null);
});

test('isCacheValid respects expiration', () => {
  const { localStorageStub } = setupGlobals();
  const app = loadApp();
  const now = Date.now();
  localStorageStub.setItem(app.CACHE_KEY_TIMESTAMP, now.toString());
  assert.equal(app.isCacheValid(), true);
  localStorageStub.setItem(app.CACHE_KEY_TIMESTAMP, (now - 11 * 60 * 1000).toString());
  assert.equal(app.isCacheValid(), false);
});

test('shouldRefreshCache checks structure and timestamp', () => {
  const { localStorageStub } = setupGlobals();
  const app = loadApp();

  // No cache present triggers refresh
  assert.equal(app.shouldRefreshCache(), true);

  const categories = {};
  for (let i = 0; i < 25; i++) {
    categories['cat' + i] = { items: { a: { title: 't', description: 'd' } } };
  }
  const data = { categories };
  localStorageStub.setItem(app.CACHE_KEY_SITE_DATA, JSON.stringify(data));
  localStorageStub.setItem(app.CACHE_KEY_TIMESTAMP, Date.now().toString());
  assert.equal(app.shouldRefreshCache(), false);

  // Expired timestamp triggers refresh
  localStorageStub.setItem(app.CACHE_KEY_TIMESTAMP, (Date.now() - 11 * 60 * 1000).toString());
  assert.equal(app.shouldRefreshCache(), true);
});

