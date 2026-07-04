/**
 * UK demo: en-GB localization with hybrid repair pass.
 * Run: node scripts/apply-en-gb-localization.mjs
 */
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {HYBRID_REPAIRS, PHRASE_REPLACEMENTS} from "./en-gb-dictionary.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set(["node_modules", ".git", "scripts"]);

function collectFiles(dir, out = []) {for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {if (SKIP_DIRS.has(entry.name)) continue;
 const full = path.join(dir, entry.name);
 if (entry.isDirectory()) collectFiles(full, out);
 else if (/\.(js|html)$/.test(entry.name)) out.push(full);}
 return out;}

function sortedPairs(pairs) {return [...pairs].sort((a, b) => b[0].length - a[0].length);}

function applyPairs(content, pairs) {let out = content;
 for (const [from, to] of pairs) {if (!from || out.indexOf(from) === -1) continue;
 out = out.split(from).join(to);}
 return out;}

function countCjk(text) {return (text.match(/[\u4e00-\u9fff]/g) || []).length;}

const allReplacements = sortedPairs([...HYBRID_REPAIRS,...PHRASE_REPLACEMENTS]);

const files = collectFiles(root);
let totalRemoved = 0;

for (const file of files) {const before = fs.readFileSync(file, "utf8");
 const after = applyPairs(before, allReplacements);
 if (after!== before) {fs.writeFileSync(file, after, "utf8");
 const removed = countCjk(before) - countCjk(after);
 totalRemoved += removed;
 console.log(`${path.relative(root, file)} (~${removed} CJK chars removed)`);}}

console.log(`Done. Approx ${totalRemoved} CJK characters removed.`);

const remaining = files.reduce((sum, file) => sum + countCjk(fs.readFileSync(file, "utf8")), 0);
console.log(`Remaining CJK characters: ${remaining}`);
