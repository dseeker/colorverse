import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TEST_DIR, "../..");
const SCRIPT_PATH = path.join(ROOT_DIR, "scripts", "build.js");
const FIXTURE_PATH = path.join(TEST_DIR, "fixtures", "site-data.json");

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

describe("offline static packaging", () => {
  let outputDir;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(TEST_DIR, ".package-output-"));
  });

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it("copies runtime assets and injects local static settings without API access", () => {
    fs.writeFileSync(path.join(outputDir, "app.js"), "obsolete runtime");
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT_PATH,
        "--package-only",
        "--data-file",
        path.relative(ROOT_DIR, FIXTURE_PATH),
        "--output-dir",
        path.relative(ROOT_DIR, outputDir),
        "--skip-images",
      ],
      {
        cwd: ROOT_DIR,
        encoding: "utf8",
        env: { ...process.env, POLLINATIONS_API_KEY: "" },
      }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    for (const excluded of ["app.js", ".env", "tests", "docs", "archive", "node_modules"]) {
      expect(fs.existsSync(path.join(outputDir, excluded))).toBe(false);
    }
    expect(JSON.parse(fs.readFileSync(path.join(outputDir, "site-data.json"), "utf8"))).toEqual(
      JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"))
    );

    for (const asset of [
      ".nojekyll",
      "service-worker.js",
      "service-worker-register.js",
      "robots.txt",
      "favicon.svg",
      "offline.html",
      "sitemap.xml",
    ]) {
      expect(fs.existsSync(path.join(outputDir, asset))).toBe(true);
    }

    const indexContent = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
    const staticSettingsIndex = indexContent.indexOf("window.__COLORVERSE_STATIC__ = true");
    const appScriptIndex = indexContent.indexOf('src="src/app.js');
    expect(staticSettingsIndex).toBeGreaterThanOrEqual(0);
    expect(indexContent).toContain("window.__COLORVERSE_DATA_URL__ = './site-data.json'");
    expect(indexContent).toContain("window.__COLORVERSE_IMAGES_BASE__ = './images'");
    expect(appScriptIndex).toBeGreaterThan(staticSettingsIndex);

    for (const sourceDirectory of ["modules", "services", "shared", "data"]) {
      const sourceFiles = listFiles(path.join(ROOT_DIR, "src", sourceDirectory));
      for (const sourceFile of sourceFiles) {
        const relativeFile = path.relative(path.join(ROOT_DIR, "src"), sourceFile);
        expect(fs.existsSync(path.join(outputDir, "src", relativeFile))).toBe(true);
      }
    }
    for (const sourceFile of listFiles(path.join(ROOT_DIR, "locales"))) {
      const relativeFile = path.relative(path.join(ROOT_DIR, "locales"), sourceFile);
      expect(fs.existsSync(path.join(outputDir, "locales", relativeFile))).toBe(true);
    }

    const runtimeFiles = [
      ...listFiles(path.join(outputDir, "src")),
      ...listFiles(path.join(outputDir, "workers", "shared")),
    ].filter(file => file.endsWith(".js"));
    for (const runtimeFile of runtimeFiles) {
      const contents = fs.readFileSync(runtimeFile, "utf8");
      const imports = contents.matchAll(
        /(?:from\s*|import\s*(?:\(\s*)?)["'](\.{1,2}\/[^"']+)["']/g
      );
      for (const [, importPath] of imports) {
        const importedPath = path.resolve(path.dirname(runtimeFile), importPath);
        expect(fs.existsSync(importedPath), `${runtimeFile} imports missing ${importPath}`).toBe(
          true
        );
      }
    }
  });

  it("fails with a clear error when the requested data file is missing", () => {
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT_PATH,
        "--package-only",
        "--data-file",
        "tests/build/fixtures/missing.json",
        "--output-dir",
        path.relative(ROOT_DIR, outputDir),
      ],
      { cwd: ROOT_DIR, encoding: "utf8" }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Required site data JSON is missing");
  });
});
