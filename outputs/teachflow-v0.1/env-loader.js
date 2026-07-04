const fs = require("fs");
const path = require("path");

function loadLocalEnv(rootDir) {
  const root = rootDir || __dirname;
  [".env.local", ".env"].forEach((name) => {
    const filePath = path.join(root, name);
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index <= 0) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    });
  });
}

module.exports = { loadLocalEnv };
