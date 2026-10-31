import { vi, afterEach } from "vitest";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

class MockIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry]);
  }
  unobserve() {}
  disconnect() {}
}

global.localStorage = localStorageMock;
global.IntersectionObserver = MockIntersectionObserver;
global.Image = class MockImage {
  src: string = "";
  naturalWidth: number = 100;
  naturalHeight: number = 100;
  complete: boolean = true;
  onload: () => {};
  onerror: () => {};
};

afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
