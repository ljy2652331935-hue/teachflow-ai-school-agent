import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [];

function walk(dir) {for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {if (entry.name === "node_modules" || entry.name === ".git") continue;
 const full = path.join(dir, entry.name);
 if (entry.isDirectory()) walk(full);
 else if (/\.(js|html)$/.test(entry.name)) files.push(full);}}

walk(root);
const set = new Set();
const re = /["'`]([^"'`]*[\u4e00-\u9fff][^"'`]*)["'`]/g;

for (const file of files) {const text = fs.readFileSync(file, "utf8");
 let match;
 while ((match = re.exec(text))) set.add(match[1]);}

console.log("Unique strings:", set.size);
[...set].sort((a, b) => b.length - a.length).forEach((s) => console.log(JSON.stringify(s)));
