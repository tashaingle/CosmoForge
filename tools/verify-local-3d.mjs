// Minimal Chrome DevTools Protocol check for local CosmoForge builds.
// Chrome must be running with --remote-debugging-port=9222.
import { writeFile } from "node:fs/promises";

const appUrl = process.env.COSMOFORGE_VERIFY_URL ?? "http://localhost:3100";
const target = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(appUrl)}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const pageErrors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    pageErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  }
});

function command(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await command("Runtime.enable");
await command("Page.enable");
const mobile = process.env.COSMOFORGE_VERIFY_MOBILE === "1";
await command("Emulation.setDeviceMetricsOverride", { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000, deviceScaleFactor: 1, mobile });
await command("Page.navigate", { url: appUrl });
if (process.env.COSMOFORGE_VERIFY_CONTROL === "1") {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const now = Date.now();
  const craft = {
    id: "browser-verify-probe", name: "Mildred", partIds: [], createdAt: now - 120000,
    updatedAt: now, status: "inflight", missionId: "mars_transfer", launchedAt: now - 45000,
    lastSimMs: now, expectedReturnAt: now + 45000, personalityId: "dramatic", relationship: 8,
    voyagesCompleted: 7, scarIds: ["scorched", "afraid_of_dark"], cargoLootIds: [], pings: [],
  };
  const seed = JSON.stringify({ version: 1, crafts: [craft], selectedCraftId: craft.id });
  await command("Runtime.evaluate", { expression: `localStorage.setItem('cosmoforge-onboarding-v1', JSON.stringify({version:1,status:'complete'})); localStorage.setItem('cosmoforge-fleet-v1', ${JSON.stringify(seed)}); location.reload()` });
}
if (process.env.COSMOFORGE_FORCE_2D === "1") {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await command("Runtime.evaluate", { expression: `localStorage.setItem('cosmoforge-3d-settings-v1', JSON.stringify({preference:'2d'})); location.reload()` });
}
if (process.env.COSMOFORGE_FORCE_3D === "1") {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await command("Runtime.evaluate", { expression: `localStorage.setItem('cosmoforge-3d-settings-v1', JSON.stringify({preference:'high'})); location.reload()` });
}
await new Promise((resolve) => setTimeout(resolve, 9000));

const evaluated = await command("Runtime.evaluate", {
  expression: `JSON.stringify({
    title: document.title,
    textLength: document.body.innerText.trim().length,
    canvasCount: document.querySelectorAll('canvas').length,
    hasErrorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
    modelRequests: performance.getEntriesByType('resource').filter(entry => entry.name.includes('/models/')).map(entry => ({ name: entry.name.split('/').pop(), bytes: entry.transferSize }))
  })`,
  returnByValue: true,
});
const result = JSON.parse(evaluated.result.value);
const shot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile("tools/browser-control.png", Buffer.from(shot.data, "base64"));

console.log(JSON.stringify({ ...result, pageErrors }, null, 2));
const expectedCanvases = process.env.COSMOFORGE_FORCE_2D === "1" ? 0 : 1;
if (!result.textLength || result.hasErrorOverlay || result.canvasCount !== expectedCanvases || pageErrors.length) process.exitCode = 1;
socket.close();
