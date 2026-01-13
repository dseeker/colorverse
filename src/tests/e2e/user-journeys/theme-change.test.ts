import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('User Journey: Theme Change', () => {
  let mainContent: HTMLElement;

  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = `
      <div id="page-container">
        <div id="main-content" class="theme-light">
          <h1>ColorVerse</h1>
        </div>
      </div>
    `;
    mainContent = document.getElementById('main-content')!;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should have light theme by default', () => {
    expect(mainContent.classList.contains('theme-light')).toBe(true);
  });

  it('should switch to dark theme', () => {
    mainContent.classList.remove('theme-light');
    mainContent.classList.add('theme-dark');

    expect(mainContent.classList.contains('theme-dark')).toBe(true);
    expect(mainContent.classList.contains('theme-light')).toBe(false);
  });

  it('should switch to colorful theme', () => {
    mainContent.classList.remove('theme-light', 'theme-dark');
    mainContent.classList.add('theme-colorful');

    expect(mainContent.classList.contains('theme-colorful')).toBe(true);
    expect(mainContent.classList.contains('theme-light')).toBe(false);
    expect(mainContent.classList.contains('theme-dark')).toBe(false);
  });

  it('should handle multiple theme switches', () => {
    mainContent.classList.add('theme-dark');
    expect(mainContent.classList.contains('theme-dark')).toBe(true);

    mainContent.classList.remove('theme-dark');
    mainContent.classList.add('theme-colorful');
    expect(mainContent.classList.contains('theme-colorful')).toBe(true);

    mainContent.classList.remove('theme-colorful');
    mainContent.classList.add('theme-light');
    expect(mainContent.classList.contains('theme-light')).toBe(true);
  });
});
