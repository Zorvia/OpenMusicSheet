import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const COMMENT_PATTERNS = [
  { pattern: /^\s*\/\//, extensions: "all" },
  { pattern: /\/\*/, extensions: "all", validator: (line) => {
    const idx = line.indexOf("/*");
    const before = line.slice(0, idx);
    const after = line.slice(idx + 2);
    if (/["'`]/.test(before)) {
      const testStr = line.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, "");
      if (!testStr.includes("/*")) return false;
    }
    return true;
  }},
  { pattern: /\*\//, extensions: "all", validator: (line) => {
    const testStr = line.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, "");
    return testStr.includes("*/");
  }},
  { pattern: /^\s*#(?!!)(?!\[)/, extensions: [".py", ".rs"] },
  { pattern: /^\s*'''/, extensions: [".py"] },
  { pattern: /^\s*"""/, extensions: [".py"] },
];

const EXCLUDED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "target",
  "build",
  ".next",
  "coverage",
  "icons",
  "tests",
];

const EXCLUDED_FILES = [
  "package-lock.json",
  "Cargo.lock",
  ".gitignore",
  ".env",
  "check-no-comments.mjs",
];

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".rs",
  ".css",
  ".html",
  ".py",
];

function getTrackedFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDED_DIRS.includes(entry.name)) continue;
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...getTrackedFiles(fullPath));
    } else if (entry.isFile()) {
      if (EXCLUDED_FILES.includes(entry.name)) continue;
      const ext = path.extname(entry.name);
      if (SOURCE_EXTENSIONS.includes(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations = [];

  const ext = path.extname(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const entry of COMMENT_PATTERNS) {
      if (entry.extensions !== "all" && !entry.extensions.includes(ext)) continue;
      if (!entry.pattern.test(line)) continue;
      if (entry.validator && !entry.validator(line)) continue;
      if (filePath.endsWith(".rs") && /^\s*#\[/.test(line)) continue;
      if (filePath.endsWith(".rs") && /^\s*#!\[/.test(line)) continue;
      if (filePath.endsWith(".html") && /<!DOCTYPE/.test(line)) continue;
      violations.push({ line: i + 1, text: line.trim() });
      break;
    }
  }

  return violations;
}

const rootDir = path.resolve(process.argv[2] || ".");
const files = getTrackedFiles(rootDir);
let hasViolations = false;

for (const file of files) {
  const violations = checkFile(file);
  if (violations.length > 0) {
    hasViolations = true;
    const relPath = path.relative(rootDir, file);
    for (const v of violations) {
      console.error(`${relPath}:${v.line}: ${v.text}`);
    }
  }
}

if (hasViolations) {
  console.error("\nComments detected in source files. Remove all comments before committing.");
  process.exit(1);
} else {
  console.log("No comments found. All source files are clean.");
  process.exit(0);
}
