import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const uniquePath = path.join(root, "data/generated/official-3.1.0-guaranteed-unique-affixes.json");
const output = path.join(root, "data/generated/d4builds-icon-index.json");
const d4buildsUrl = "https://d4builds.gg/database/uniques/";
const assetBase = "https://sunderarmor.com/DIABLO4/Uniques/2";

const aliasNames = new Map([
  ["El'Druin, Sword of Justice", "El'druin, Sword of Justice"],
  ["Mjölnic Ring", "Mjölnic Ryng"],
  ["Nesekem, the Herald", "Nesekem, The Herald"]
]);

function chromePath() {
  return process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function urlFromName(name) {
  return `${assetBase}/${encodeURI(name.toLowerCase().replace(/ /g, "_"))}.png`;
}

async function headOk(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchJson(url) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // DevTools endpoint is not ready yet.
    }
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result ?? {});
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId;
      nextId += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      ws.close();
    }
  };
}

async function collectRenderedIcons() {
  const port = 9342 + Math.floor(Math.random() * 400);
  const chrome = spawn(chromePath(), [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/codex-d4builds-icons-${Date.now()}`,
    "about:blank"
  ], { stdio: "ignore" });

  let client;
  try {
    const tabs = await fetchJson(`http://127.0.0.1:${port}/json`);
    const page = tabs.find((tab) => tab.type === "page") ?? tabs[0];
    client = connect(page.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Page.navigate", { url: d4buildsUrl });
    await wait(8000);
    const heightResult = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression: "document.documentElement.scrollHeight"
    });
    const height = heightResult.result.value || 30000;
    for (let y = 0; y <= height + 2000; y += 700) {
      await client.send("Runtime.evaluate", { expression: `window.scrollTo(0, ${y});` });
      await wait(170);
    }
    await wait(1500);
    const result = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const seen = new Map();
        for (const img of document.querySelectorAll("img.unique__icon")) {
          const name = (img.alt || "").trim();
          const src = img.currentSrc || img.src;
          if (name && src && src.includes("/DIABLO4/Uniques/")) seen.set(name, src);
        }
        return [...seen.entries()].map(([name, url]) => ({ name, url }));
      })()`
    });
    return result.result.value ?? [];
  } finally {
    if (client) client.close();
    chrome.kill("SIGTERM");
  }
}

const official = JSON.parse(await readFile(uniquePath, "utf8"));
const renderedIcons = await collectRenderedIcons();
const exact = new Map(renderedIcons.map((item) => [item.name, item]));
const normalized = new Map(renderedIcons.map((item) => [normalizeName(item.name), item]));
const items = [];

for (const item of official.items) {
  const alias = aliasNames.get(item.name);
  let match = exact.get(item.name) ?? (alias ? exact.get(alias) : null) ?? normalized.get(normalizeName(item.name));
  let matchType = match ? (alias && match.name === alias ? "alias" : "rendered_alt") : "none";

  if (!match) {
    const guessedUrl = urlFromName(item.name);
    if (await headOk(guessedUrl)) {
      match = { name: item.name, url: guessedUrl };
      matchType = "verified_url_guess";
    }
  }

  items.push({
    name: item.name,
    iconUrl: match?.url ?? null,
    sourceName: match?.name ?? null,
    matchType
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  source: {
    id: "d4builds_sunderarmor_icons",
    name: "D4Builds rendered unique item icons",
    pageUrl: d4buildsUrl,
    assetHost: "https://sunderarmor.com",
    usage: "external_url_reference_only_no_asset_download"
  },
  itemCount: items.length,
  matchedCount: items.filter((item) => item.iconUrl).length,
  limitations: [
    "This file stores external icon URLs only; it does not download or commit third-party image assets.",
    "D4Builds and sunderarmor assets are third-party community resources and are not official Blizzard API data.",
    "The frontend must keep local generated icons as a fallback when an external URL fails."
  ],
  items
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${payload.matchedCount}/${payload.itemCount} external icon URLs to ${path.relative(root, output)}`);
