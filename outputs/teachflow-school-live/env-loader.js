const fs = require("fs");
const path = require("path");

function loadLocalEnv(rootDir) {
  const root = rootDir || __dirname;
  [
    { name: ".env.local", overrideExisting: true },
    { name: ".env", overrideExisting: false }
  ].forEach(({ name, overrideExisting }) => {
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
      if (overrideExisting || !process.env[key]) process.env[key] = value;
    });
  });
}

module.exports = { loadLocalEnv };
