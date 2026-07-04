const DEFAULT_MODEL = "gpt-5.5";
const DEFAULT_FALLBACK_MODEL = "gpt-4.1-mini";
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const IMAGES_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_IMAGE_MODEL = "gpt-image-2";
const DEFAULT_IMAGE_FALLBACK_MODEL = "gpt-image-1";

function isConfigured() {return Boolean(apiKey()) && process.env.TEACHFLOW_AI_MODE!== "local";}

function status() {return {configured: isConfigured(),
 provider: "openai",
 mode: isConfigured()? "live": "local",
 model: modelName(),
 fallbackModel: fallbackModelName(),
 imageModel: imageModelName(),
 imageFallbackModel: imageFallbackModelName()};}

async function generateText(options) {if (!isConfigured()) {return {ok: false,
 mode: "local",
 provider: "openai",
 model: modelName(),
 error: "OPENAI_API_KEY is not configured"};}

 const models = unique([modelName(), fallbackModelName()].filter(Boolean));
 let lastError = null;
 for (const model of models) {try {const result = await callResponsesApi({...options, model});
 return {ok: true,
 mode: "live",
 provider: "openai",
 model,
 text: result.text,
 responseId: result.responseId};} catch (error) {lastError = error;
 if (!shouldTryFallback(error)) break;}}

 return {ok: false,
 mode: "local",
 provider: "openai",
 model: modelName(),
 error: safeError(lastError)};}

async function generateImage(options) {if (!isConfigured()) {return {ok: false,
 mode: "local",
 provider: "openai",
 model: imageModelName(),
 error: "OPENAI_API_KEY is not configured"};}

 const models = unique([imageModelName(), imageFallbackModelName()].filter(Boolean));
 let lastError = null;
 for (const model of models) {try {const result = await callImagesApi({...options, model});
 return {ok: true,
 mode: "live",
 provider: "openai",
 model,
 imageBase64: result.imageBase64,
 revisedPrompt: result.revisedPrompt};} catch (error) {lastError = error;
 if (!shouldTryFallback(error)) break;}}

 return {ok: false,
 mode: "local",
 provider: "openai",
 model: imageModelName(),
 error: safeError(lastError)};}

async function callResponsesApi(options) {const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENAI_TIMEOUT_MS || 30000));
 try {const body = {model: options.model,
 input: [{role: "developer",
 content: String(options.instructions || "You are a helpful assistant.")},
 {role: "user",
 content: typeof options.input === "string"? options.input: JSON.stringify(options.input)}],
 max_output_tokens: Number(options.maxOutputTokens || 900)};

 const response = await fetch(RESPONSES_URL, {method: "POST",
 headers: {Authorization: `Bearer ${apiKey()}`,
 "Content-Type": "application/json"},
 body: JSON.stringify(body),
 signal: controller.signal});
 const payload = await response.json().catch(() => ({}));
 if (!response.ok) {const message = payload?.error?.message || `OpenAI request failed with ${response.status}`;
 const error = new Error(message);
 error.status = response.status;
 error.type = payload?.error?.type || "";
 throw error;}
 return {responseId: payload.id || null,
 text: extractOutputText(payload)};} finally {clearTimeout(timeout);}}

async function callImagesApi(options) {const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENAI_IMAGE_TIMEOUT_MS || 180000));
 try {const body = {model: options.model,
 prompt: String(options.prompt || ""),
 n: 1,
 size: options.size || process.env.OPENAI_IMAGE_SIZE || "1024x1024",
 quality: options.quality || process.env.OPENAI_IMAGE_QUALITY || "medium"};

 const response = await fetch(IMAGES_URL, {method: "POST",
 headers: {Authorization: `Bearer ${apiKey()}`,
 "Content-Type": "application/json"},
 body: JSON.stringify(body),
 signal: controller.signal});
 const payload = await response.json().catch(() => ({}));
 if (!response.ok) {const message = payload?.error?.message || `OpenAI image request failed with ${response.status}`;
 const error = new Error(message);
 error.status = response.status;
 error.type = payload?.error?.type || "";
 throw error;}

 const first = payload?.data?.[0] || {};
 return {imageBase64: first.b64_json || "",
 revisedPrompt: first.revised_prompt || ""};} finally {clearTimeout(timeout);}}

function extractOutputText(payload) {if (typeof payload?.output_text === "string") return payload.output_text.trim();
 const text = [];
 (payload?.output || []).forEach((item) => {(item.content || []).forEach((content) => {if (typeof content.text === "string") text.push(content.text);});});
 return text.join("\n").trim();}

function modelName() {return process.env.OPENAI_MODEL || DEFAULT_MODEL;}

function fallbackModelName() {return process.env.OPENAI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;}

function imageModelName() {return process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;}

function imageFallbackModelName() {return process.env.OPENAI_IMAGE_FALLBACK_MODEL || DEFAULT_IMAGE_FALLBACK_MODEL;}

function apiKey() {return process.env.OPENAI_API_KEY || "";}

function shouldTryFallback(error) {if (error?.name === "AbortError") return true;
 return [400, 404, 429, 500, 502, 503, 504].includes(Number(error?.status));}

function safeError(error) {if (!error) return "OpenAI request failed";
 if (error.name === "AbortError") return "OpenAI request timed out";
 return String(error.message || "OpenAI request failed").replace(/Incorrect API key provided:[^.]+/i, "Incorrect API key provided: [redacted]").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").replace(/[A-Za-z0-9_-]{12,}\*+[A-Za-z0-9_-]*/g, "[redacted]");}

function unique(values) {return Array.from(new Set(values));}

module.exports = {status,
 isConfigured,
 generateText,
 generateImage};
