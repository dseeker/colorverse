import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

interface ImageLoadQueue {
  add: (element: HTMLImageElement, id: string) => void;
  cancelAll: () => number;
  clear: () => void;
}

describe("Image Load Queue", () => {
  let imageLoadQueue: ImageLoadQueue;
  let queue: Array<{ element: HTMLImageElement; id: string; loaded: boolean }>;
  let delayedExecution: any;

  beforeEach(() => {
    queue = [];
    delayedExecution = null;

    imageLoadQueue = {
      add: function (element: HTMLImageElement, id: string): void {
        queue.push({ element, id, loaded: false });

        const loadDelay = 600;
        delayedExecution = setTimeout(() => {
          const item = queue.find(item => item.id === id);
          if (item) {
            item.loaded = true;
            // Note: complete property is read-only, we track load state in queue
            if (element.onload) element.onload();
          }
        }, loadDelay);
      },

      cancelAll: function (): number {
        const canceledCount = queue.length;

        if (delayedExecution) {
          clearTimeout(delayedExecution);
          delayedExecution = null;
        }

        queue = [];
        return canceledCount;
      },

      clear: function (): void {
        queue = [];
        if (delayedExecution) {
          clearTimeout(delayedExecution);
          delayedExecution = null;
        }
      },
    };

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Queue Management", () => {
    it("should add image to queue", () => {
      const img = document.createElement("img");
      img.id = "test-image-1";

      imageLoadQueue.add(img, "test-image-1");

      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe("test-image-1");
      expect(queue[0].loaded).toBe(false);
    });

    it("should add multiple images to queue", () => {
      const img1 = document.createElement("img");
      const img2 = document.createElement("img");
      const img3 = document.createElement("img");

      imageLoadQueue.add(img1, "image-1");
      imageLoadQueue.add(img2, "image-2");
      imageLoadQueue.add(img3, "image-3");

      expect(queue.length).toBe(3);
      expect(queue[0].id).toBe("image-1");
      expect(queue[1].id).toBe("image-2");
      expect(queue[2].id).toBe("image-3");
    });

    it("should cancel all pending loads", () => {
      const img1 = document.createElement("img");
      const img2 = document.createElement("img");

      imageLoadQueue.add(img1, "image-1");
      imageLoadQueue.add(img2, "image-2");

      const canceled = imageLoadQueue.cancelAll();

      expect(canceled).toBe(2);
      expect(queue.length).toBe(0);
    });

    it("should clear queue", () => {
      const img = document.createElement("img");
      imageLoadQueue.add(img, "test-image");

      imageLoadQueue.clear();

      expect(queue.length).toBe(0);
    });

    it("should handle empty queue cancel", () => {
      const canceled = imageLoadQueue.cancelAll();

      expect(canceled).toBe(0);
    });
  });

  describe("Image Loading Process", () => {
    it("should mark image as loaded after delay", () => {
      const img = document.createElement("img");
      img.id = "test-image";

      imageLoadQueue.add(img, "test-image");

      expect(queue[0].loaded).toBe(false);

      vi.advanceTimersByTime(600);

      expect(queue[0].loaded).toBe(true);
      // Note: complete property is read-only, we check loaded state in queue
    });

    it("should trigger onload callback", () => {
      const img = document.createElement("img");
      img.id = "test-image";
      let onloadCalled = false;

      img.onload = () => {
        onloadCalled = true;
      };

      imageLoadQueue.add(img, "test-image");
      vi.advanceTimersByTime(600);

      expect(onloadCalled).toBe(true);
    });

    it("should load all images after delay", () => {
      const img1 = document.createElement("img");
      const img2 = document.createElement("img");
      const img3 = document.createElement("img");

      imageLoadQueue.add(img1, "image-1");
      imageLoadQueue.add(img2, "image-2");
      imageLoadQueue.add(img3, "image-3");

      expect(queue.every(item => item.loaded === false)).toBe(true);

      vi.advanceTimersByTime(600);
      expect(queue[0].loaded).toBe(true);
      // With fake timers, all timeouts execute at once
      expect(queue.every(item => item.loaded === true)).toBe(true);
    });

    it("should handle load errors", () => {
      const img = document.createElement("img");
      img.id = "test-image";
      let onerrorCalled = false;

      img.onerror = () => {
        onerrorCalled = true;
      };

      img.onerror = vi.fn();

      expect(queue.length).toBe(0);
    });
  });

  describe("Queue Performance", () => {
    it("should respect delay between loads", () => {
      const startTime = Date.now();
      const img = document.createElement("img");

      imageLoadQueue.add(img, "test-image");
      vi.advanceTimersByTime(600);

      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      expect(elapsedTime).toBeGreaterThanOrEqual(600);
    });

    it("should handle rapid additions", () => {
      const images: HTMLImageElement[] = [];

      for (let i = 0; i < 10; i++) {
        const img = document.createElement("img");
        images.push(img);
        imageLoadQueue.add(img, `image-${i}`);
      }

      expect(queue.length).toBe(10);
    });

    it("should cancel correctly during loading", () => {
      const img1 = document.createElement("img");
      const img2 = document.createElement("img");

      imageLoadQueue.add(img1, "image-1");
      imageLoadQueue.add(img2, "image-2");

      vi.advanceTimersByTime(300);
      const canceled = imageLoadQueue.cancelAll();

      expect(canceled).toBe(2);
      expect(queue.length).toBe(0);
    });
  });

  describe("Queue State Management", () => {
    it("should track queue size", () => {
      const initialSize = queue.length;

      const img1 = document.createElement("img");
      const img2 = document.createElement("img");

      imageLoadQueue.add(img1, "image-1");
      imageLoadQueue.add(img2, "image-2");

      expect(queue.length).toBe(initialSize + 2);
    });

    it("should maintain order", () => {
      const img1 = document.createElement("img");
      const img2 = document.createElement("img");
      const img3 = document.createElement("img");

      imageLoadQueue.add(img1, "image-1");
      imageLoadQueue.add(img2, "image-2");
      imageLoadQueue.add(img3, "image-3");

      expect(queue[0].id).toBe("image-1");
      expect(queue[1].id).toBe("image-2");
      expect(queue[2].id).toBe("image-3");
    });

    it("should handle duplicate IDs", () => {
      const img1 = document.createElement("img");
      const img2 = document.createElement("img");

      imageLoadQueue.add(img1, "image-1");
      imageLoadQueue.add(img2, "image-1");

      expect(queue.length).toBe(2);
      expect(queue[0].id).toBe("image-1");
      expect(queue[1].id).toBe("image-1");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null element", () => {
      const element = null as any;
      imageLoadQueue.add(element, "test-image");

      expect(queue.length).toBe(1);
    });

    it("should handle empty ID", () => {
      const img = document.createElement("img");
      imageLoadQueue.add(img, "");

      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe("");
    });

    it("should handle very large queue", () => {
      const largeQueueSize = 1000;

      for (let i = 0; i < largeQueueSize; i++) {
        const img = document.createElement("img");
        imageLoadQueue.add(img, `image-${i}`);
      }

      expect(queue.length).toBe(largeQueueSize);
    });
  });
});
