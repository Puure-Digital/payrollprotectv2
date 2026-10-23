// Smoke test for the site. Starts the local preview server on a spare port, drives headless Chrome
// over the DevTools protocol, and checks what matters most: the figures, the booking page, the
// film's loading and the accessibility fixes. Prints one line per check; exits 1 if any fails.
// usage: node tools/check.mjs
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// shortcut: defaults to Chrome's Windows install; set CHROME to run it anywhere else.
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8091, DEBUG = 9391, BASE = `http://localhost:${PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let failed = 0;
function check(name, ok, got) {
  console.log((ok ? 'ok    ' : 'FAIL  ') + name + (ok ? '' : '  (got ' + JSON.stringify(got) + ')'));
  if (!ok) failed++;
}

const server = spawn(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'serve.js'), String(PORT)], { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'pp-check-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

// Opens a page in the browser's tab and returns helpers for it.
async function open(path, { width = 1440, height = 900, mobile = false } = {}) {
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
    if (!target) await sleep(250);
  }
  if (!target) throw new Error('Chrome did not start (set CHROME to its path)');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0, onLoad = null;
  const pending = new Map(), errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    else if (m.method === 'Page.loadEventFired' && onLoad) onLoad();
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const loaded = new Promise((r) => { onLoad = r; });
  await send('Page.navigate', { url: BASE + path });
  await loaded;
  await sleep(2500);
  const run = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { run, errors, close: () => ws.close() };
}

const scrollTo = (y) => `(() => { const y = ${y}; if (window.ppLenis) ppLenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); ScrollTrigger.update(); return 1; })()`;
const frames = `performance.getEntriesByType('resource').filter((e) => e.name.includes('/assets/frames/')).length`;
const view = `[...document.querySelectorAll('#stage .sv')].findIndex((v) => v.classList.contains('is-on'))`;

try {
  // Home page, desktop.
  let p = await open('index.html');
  const figures = await p.run(`[...document.querySelectorAll('.stats .od, .calc .od')].map((e) => e.textContent)`);
  check('home: figures read as their values', same(figures, ['£82bn', '1.7%', '£1.4bn', '£250,000', '£18,417', '£221,000']), figures);
  const summary = await p.run(`document.querySelector('[data-pc="summary"]').textContent`);
  check('home: pilot estimate is £46,143 by day 90', summary.includes('£46,143'), summary);
  const total = await p.run(`+document.querySelector('.hero').dataset.frames`);
  const before = await p.run(frames);
  check('home: hero loads only its opening frames before a scroll', before === Math.ceil(total * 0.2), before);
  await p.run(scrollTo(400));
  await sleep(5000);
  const after = await p.run(frames);
  check('home: the rest of the film loads after the first scroll', after === total, after);
  check('home: no script errors', p.errors.length === 0, p.errors);
  p.close();

  // Booking page.
  p = await open('book.html');
  const held = await p.run(`document.querySelector('[data-s="held"]').textContent`);
  check('book: summary estimate is £46,143', held === '£46,143', held);
  // The request is the client's GoHighLevel form, embedded as on the live site.
  const ghl = await p.run(`[!!document.querySelector('#book-form iframe[src="https://api.leadconnectorhq.com/widget/form/50lzTXehMgKX7CgeLy2f"]'), !!document.querySelector('script[src="https://link.msgsndr.com/js/form_embed.js"]')]`);
  check('book: the GoHighLevel form and its embed script are on the page', same(ghl, [true, true]), ghl);
  check('book: no script errors', p.errors.length === 0, p.errors);
  p.close();
  p = await open('book.html?spend=1000000');
  const heldAt = await p.run(`[document.querySelector('[data-s="spend"]').textContent, document.querySelector('[data-s="held"]').textContent]`);
  check('book: a spend from the calculator sets the estimate', same(heldAt, ['£1,000,000', '£184,571']), heldAt);
  p.close();

  // The not-found page, at a nested address, so its root paths are tested too.
  const miss = await fetch(BASE + 'old/no-such-page');
  const missText = await miss.text();
  check('404: a missing page answers 404 with the site page', miss.status === 404 && missText.includes('Page not found'), miss.status);
  p = await open('old/no-such-page');
  const bg = await p.run(`getComputedStyle(document.body).backgroundColor`);
  check('404: styled from the site root', bg === 'rgb(243, 244, 244)', bg);
  check('404: no script errors', p.errors.length === 0, p.errors);
  p.close();

  // Home page, phone.
  p = await open('index.html', { width: 375, height: 812, mobile: true });
  const shut = await p.run(`(document.querySelector('.nav__burger').click(), [document.querySelector('main').inert, document.querySelector('footer').inert])`);
  check('phone: the open menu shuts the page behind it', same(shut, [true, true]), shut);
  const freed = await p.run(`(document.querySelector('.nav__burger').click(), document.querySelector('main').inert)`);
  check('phone: closing the menu frees it', freed === false, freed);
  await p.run(`(() => { const s = document.querySelector('#stage'); return ${scrollTo('s.getBoundingClientRect().top + scrollY - 200')}; })()`);
  await sleep(600);
  await p.run(`(document.querySelector('.stage__pause').click(), 1)`);
  const v0 = await p.run(view);
  await sleep(4200);
  const paused = await p.run(`[${view}, document.querySelector('.stage__pause').textContent]`);
  check('phone: Pause stops the How it works stage', same(paused, [v0, 'Play']), paused);
  await p.run(`(document.querySelector('.stage__pause').click(), 1)`);
  await sleep(3900);
  const moved = await p.run(view);
  check('phone: Play starts it again', moved !== v0, moved);
  check('phone: no script errors', p.errors.length === 0, p.errors);
  p.close();
} catch (err) {
  check('run', false, err.message);
} finally {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
  else chrome.kill();
  server.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
