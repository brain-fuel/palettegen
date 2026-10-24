// Real browser acceptance checks. Palette logic stays in goml; these tests
// exercise both deployments, including touch input and mobile WebKit.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { chromium, webkit } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'tmp/browser');
await fs.mkdir(artifacts, {recursive: true});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(width, height, pixel) {
  const chunk = (name, body) => {
    const type = Buffer.from(name), length = Buffer.alloc(4), crc = Buffer.alloc(4);
    length.writeUInt32BE(body.length); crc.writeUInt32BE(crc32(Buffer.concat([type, body])));
    return Buffer.concat([length, type, body, crc]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(width * 4 + 1);
    for (let x = 0; x < width; x++) Buffer.from(pixel(x, y)).copy(row, x * 4 + 1);
    scanlines.push(row);
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.concat(scanlines))), chunk('IEND', Buffer.alloc(0))]);
}
const photo = png(320, 160, x => x < 160 ? [124, 58, 237, 255] : [232, 121, 36, 255]);
const partial = png(40, 20, () => [255, 0, 0, 128]);
const transparent = png(40, 20, () => [0, 0, 0, 0]);
const wide = png(2400, 400, () => [124, 58, 237, 255]);
const pixels = png(21, 21, (x, y) => [x * 10, y * 10, 0, 255]);

// A real second HTTPS origin exercises browser CORS enforcement. Intercepted
// requests alone are insufficient to prove pixel-access restrictions.
const keyPath = path.join(artifacts, 'test-key.pem');
const certPath = path.join(artifacts, 'test-cert.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-days', '1', '-nodes', '-keyout', keyPath, '-out', certPath, '-subj', '/CN=localhost'], {stdio: 'ignore'});
const imageServer = https.createServer({key: await fs.readFile(keyPath), cert: await fs.readFile(certPath)}, async (request, response) => {
  const pathname = new URL(request.url, 'https://localhost').pathname;
  const cors = pathname === '/blocked.png' ? {} : {'Access-Control-Allow-Origin': '*'};
  if (pathname === '/slow.png') await new Promise(resolve => setTimeout(resolve, 250));
  response.writeHead(200, {'Content-Type': 'image/png', ...cors});
  response.end(pathname === '/invalid.png' ? Buffer.from('not an image') : photo);
});
await new Promise(resolve => imageServer.listen(0, '127.0.0.1', resolve));
const imageURL = `https://127.0.0.1:${imageServer.address().port}`;

const staticServer = http.createServer(async (request, response) => {
  const file = new URL(request.url, 'http://localhost').pathname;
  const allowed = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/app.wasm', 'app.wasm'], ['/app.wasm.gz', 'app.wasm.gz'], ['/browser.js', 'browser.js'], ['/wasm_exec.js', 'wasm_exec.js']]);
  if (!allowed.has(file)) { response.writeHead(404).end(); return; }
  try {
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.wasm') ? 'application/wasm' : file.endsWith('.gz') ? 'application/gzip' : 'text/html';
    response.writeHead(200, {'Content-Type': type});
    response.end(await fs.readFile(path.join(root, 'try', allowed.get(file))));
  } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => staticServer.listen(0, '127.0.0.1', resolve));
const staticURL = `http://127.0.0.1:${staticServer.address().port}/`;
const reservation = http.createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const nativePort = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const native = spawn(path.join(root, 'palettegen'), [], {cwd: root, env: {...process.env, PORT: String(nativePort)}, stdio: 'pipe'});
let nativeLog = '';
native.stdout.on('data', bytes => nativeLog += bytes);
native.stderr.on('data', bytes => nativeLog += bytes);
const nativeURL = `http://127.0.0.1:${nativePort}/`;
for (let i = 0; ; i++) {
  try { if ((await fetch(nativeURL)).ok) break; } catch {}
  if (i > 100) throw new Error(`Server did not start: ${nativeLog}`);
  await new Promise(resolve => setTimeout(resolve, 50));
}

async function sources(page) {
  if (await page.locator('#picture-source-options').evaluate(e => e.hidden)) await page.locator('#change-picture').click();
}
async function upload(page, buffer, name = 'brand.png') {
  const file = {name, mimeType: name.endsWith('.jpg') ? 'image/jpeg' : 'image/png', buffer};
  if (await page.locator('#picture-placeholder').isVisible()) await page.locator('#image-file').setInputFiles(file);
  else {
    await sources(page);
    const chooser = page.waitForEvent('filechooser');
    await page.locator('#choose-replacement').click();
    await (await chooser).setFiles(file);
  }
}
const ready = page => page.waitForFunction(() => document.getElementById('image-tools')?.hidden === false, {timeout: 30000});
const statusContains = async (page, text) => {
  try { await page.waitForFunction(text => document.getElementById('image-status').textContent.includes(text), text); }
  catch (error) { throw new Error(`Expected image status ${JSON.stringify(text)}, received ${JSON.stringify(await page.locator('#image-status').textContent())}`, {cause: error}); }
};
const jsonPalette = async page => JSON.parse(await page.locator('.json-view pre').textContent());
const exactAnchor = (scale, hex) => assert(scale.shades.some(shade => shade.hex === hex), `Missing exact anchor ${hex}`);
async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth}));
  assert(dimensions.scroll <= dimensions.client + 1, `${label}: page overflow ${JSON.stringify(dimensions)}`);
}
async function paletteHas(page, role, hex) {
  await page.waitForFunction(({role, hex}) => {
    const palette = JSON.parse(document.querySelector('.json-view pre').textContent);
    return palette[role]?.[0]?.shades.some(shade => shade.hex === hex);
  }, {role, hex});
}
async function visibleInViewport(page, selector) {
  const box = await page.locator(selector).boundingBox();
  assert(box && box.y >= 0 && box.y + box.height <= page.viewportSize().height + 1, `${selector} must stay in reach: ${JSON.stringify(box)}`);
}
async function runFlow(browser, deployment, baseURL, touch) {
  const context = await browser.newContext({viewport: {width: touch ? 390 : 1280, height: touch ? 844 : 900}, hasTouch: touch, isMobile: touch, ignoreHTTPSErrors: true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => {
    const message = String(error);
    if (message.includes('/blocked.png') && message.includes('access control checks')) return;
    errors.push(message);
  });
  await page.goto(baseURL); await ready(page); await page.evaluate(() => document.fonts.ready);
  assert.match(await page.locator('h1').evaluate(e => getComputedStyle(e).fontFamily), /Overpass/);
  assert.match(await page.locator('.sw-hex').first().evaluate(e => getComputedStyle(e).fontFamily), /Atkinson Hyperlegible Mono/);
  assert(await page.locator('#paste-picture').isVisible());
  assert((await page.locator('#picture-title').boundingBox()).y < (await page.locator('#manual-title').boundingBox()).y);
  assert((await page.locator('#manual-title').boundingBox()).y < page.viewportSize().height);
  assert.equal(await page.locator('.hero .meta').count(), 0);
  assert.equal(await page.locator('.hero p').count(), 0);
  assert.equal(await page.locator('h1').textContent(), 'Palette Builder');
  assert.equal(await page.getByRole('button', {name: 'Generate palette', exact: true}).count(), 0);
  assert.equal(await page.locator('#manual-apply').isVisible(), false);

  await upload(page, photo); await statusContains(page, 'Picture ready');
  const picture = page.locator('#picture');
  const initialPalette = await jsonPalette(page);
  assert(await page.locator('#pick-primary').isDisabled());
  assert(await page.locator('#pick-secondary').isDisabled());
  assert.equal(await picture.evaluate(e => e.closest('#drop-zone')?.id), 'drop-zone', 'Picture must replace the upload placeholder in the same frame');
  assert.equal(await page.locator('#picture-placeholder').isVisible(), false);
  assert.equal(await page.locator('#picture-source-options').evaluate(e => e.hidden), true);
  const rect = await picture.boundingBox();
  const point = {x: rect.width * .25, y: rect.height * .5};
  if (touch) await picture.tap({position: point}); else await picture.click({position: point});
  assert.equal(await page.locator('#sample-hex').textContent(), '#7C3AED');
  assert.deepEqual(await jsonPalette(page), initialPalette, 'Selecting a new color must only preview it');
  assert.equal(await page.locator('#selection-notice').isVisible(), false);
  assert.match(await page.locator('#sampling-role').textContent(), /Preview.*not assigned/);
  // Navigation must preserve both the preview and palette. Pinch/drag must
  // never turn into a source tap on release.
  const viewport = page.locator('#picture-viewport');
  const zoom = async () => Number(await viewport.getAttribute('data-zoom'));
  await page.locator('#picture-zoom-in').click();
  await page.locator('#picture-zoom-in').click();
  assert(Math.abs(await zoom() - 2.25) < .001);
  const frame = await viewport.boundingBox();
  await viewport.click({position:{x:frame.width/2+20,y:frame.height/2}});
  assert.equal(await page.locator('#sample-hex').textContent(),'#E87924','Zoomed taps must map to the correct source pixels');
  const previewBeforeNavigation = await page.locator('#sample-hex').textContent();
  const beforePan = await picture.evaluate(e=>e.style.transform);
  await page.mouse.move(frame.x+frame.width/2,frame.y+frame.height/2); await page.mouse.down();
  await page.mouse.move(frame.x+frame.width/2-34,frame.y+frame.height/2-13,{steps:5}); await page.mouse.up();
  assert.notEqual(await picture.evaluate(e=>e.style.transform),beforePan,'Dragging must pan the enlarged picture');
  assert.equal(await page.locator('#sample-hex').textContent(),previewBeforeNavigation);
  const beforePinch = await zoom();
  const middle = {x:frame.x+frame.width/2,y:frame.y+frame.height/2};
  const pointer = (id,x) => ({pointerId:id,pointerType:'touch',isPrimary:id===71,clientX:x,clientY:middle.y,buttons:1,bubbles:true});
  await viewport.dispatchEvent('pointerdown',pointer(71,middle.x-25));
  await viewport.dispatchEvent('pointerdown',pointer(72,middle.x+25));
  await viewport.dispatchEvent('pointermove',pointer(71,middle.x-60));
  await viewport.dispatchEvent('pointermove',pointer(72,middle.x+60));
  const spreadZoom = await zoom();
  assert(spreadZoom > beforePinch * 2, 'Spreading two fingers must zoom in');
  await viewport.dispatchEvent('pointermove',pointer(71,middle.x-30));
  await viewport.dispatchEvent('pointermove',pointer(72,middle.x+30));
  assert(await zoom() < spreadZoom, 'Closing two fingers must zoom out');
  await viewport.dispatchEvent('pointerup',pointer(71,middle.x-30));
  await viewport.dispatchEvent('pointerup',pointer(72,middle.x+30));
  await viewport.dispatchEvent('click',{clientX:middle.x,clientY:middle.y,bubbles:true});
  assert.equal(await page.locator('#sample-hex').textContent(),previewBeforeNavigation,'Pinch release must not select another pixel');
  if (browser.browserType().name()==='chromium') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    const finger = (id,x)=>({id,x,y:middle.y});
    const nativeBefore = await zoom();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(1,middle.x-20),finger(2,middle.x+20)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(1,middle.x-50),finger(2,middle.x+50)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert(await zoom()>nativeBefore,'Native browser touch input must reach the custom pinch control');
    assert.equal(await page.evaluate(()=>visualViewport.scale),1,'Picture pinch must not zoom the whole page');
    assert.equal(await page.locator('#sample-hex').textContent(),previewBeforeNavigation);
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await cdp.detach();
  }
  const wheelBefore = await zoom();
  const wheelDefault = await viewport.evaluate((e,point)=>e.dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY:-10,clientX:point.x,clientY:point.y,bubbles:true,cancelable:true})),middle);
  assert.equal(wheelDefault,false,'Trackpad pinch must be handled inside the picture');
  assert(await zoom()>wheelBefore);
  assert.deepEqual(await jsonPalette(page),initialPalette,'Zoom and navigation must never mutate palette roles');
  await page.locator('#picture-zoom-out').click();
  await page.locator('#picture-fit').click(); assert.equal(await zoom(),1);
  await picture.focus(); await page.keyboard.press('+'); assert(await zoom()>1);
  await page.keyboard.press('0'); assert.equal(await zoom(),1);
  await picture.click({position:point});
  await page.locator('#pick-primary').click();
  await paletteHas(page, 'primary', '#7C3AED');
  assert.equal(await page.locator('#primary-hex').inputValue(), '#7C3AED');
  assert.match(await page.locator('#selection-notice').textContent(), /Primary set to #7C3AED/);
  const primaryOnly = await jsonPalette(page);
  await page.locator('.suggestion[data-color="#E87924"]').click();
  assert.equal(await page.locator('#sample-hex').textContent(), '#E87924');
  assert.deepEqual(await jsonPalette(page), primaryOnly, 'Looking for Secondary must never overwrite Primary');
  assert.equal(await page.locator('#selection-notice').isVisible(), false, 'An old success notice must not describe the new preview');
  await page.locator('#pick-secondary').click();
  await paletteHas(page, 'secondary', '#E87924');
  assert.equal(await page.locator('#primary-hex').inputValue(), '#7C3AED');
  assert.match(await page.locator('#selection-notice').textContent(), /Secondary set to #E87924/);
  await page.locator('#selection-notice').waitFor({state:'hidden', timeout:6000});
  assert.equal(await page.locator('#secondary-hex').inputValue(), '#E87924');
  const assignedPair = await jsonPalette(page);
  await page.locator('.suggestion[data-color="#7C3AED"]').click();
  assert.match(await page.locator('#sampling-role').textContent(), /Fine-tuning Primary/);
  await page.locator('.suggestion[data-color="#E87924"]').click();
  assert.match(await page.locator('#sampling-role').textContent(), /Fine-tuning Secondary/);
  assert.deepEqual(await jsonPalette(page), assignedPair, 'Re-selecting existing colors must not change the palette');
  // Fit the complete working area from the top, including browser-chrome
  // allowance for an iPhone SE, a narrow legacy screen, and a Pixel 6.
  for (const [width,height] of [[375,548],[375,667],[320,568],[412,780]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>scrollTo(0,0));
    await noOverflow(page,`${deployment} compact ${width}x${height}`);
    for (const selector of ['h1','#picture-viewport','#picture-zoom-in','#picture-fit','#change-picture','#clear-picture','#magnifier','#pick-primary','#pick-secondary','#remove-sample-secondary']) await visibleInViewport(page,selector);
    const change = await page.locator('#change-picture').boundingBox(), remove = await page.locator('#clear-picture').boundingBox();
    assert(Math.abs(change.y-remove.y)<1,'Change and Remove picture must share one row');
    for (const selector of ['#picture-zoom-in','#picture-zoom-out','#picture-fit','#change-picture','#clear-picture','#pick-primary','#pick-secondary']) assert((await page.locator(selector).boundingBox()).height>=44);
    if (height===548 || width===320) await page.screenshot({path:path.join(artifacts,`${deployment}-compact-${width}x${height}.png`)});
  }
  await page.setViewportSize({width:touch?390:1280,height:touch?844:900});
  await picture.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(artifacts,`${deployment}-picture.png`)});
  const support = JSON.stringify((await jsonPalette(page)).supporting);
  await page.locator('#magnifier').scrollIntoViewIfNeeded();
  await visibleInViewport(page, '#clear-picture');
  await visibleInViewport(page, '#view-palette');
  await visibleInViewport(page, '#remove-sample-secondary');
  await page.locator('#remove-sample-secondary').click();
  await page.waitForFunction(() => !JSON.parse(document.querySelector('.json-view pre').textContent).secondary);
  assert.equal(JSON.stringify((await jsonPalette(page)).supporting), support);
  await page.locator('#undo-palette').click(); await paletteHas(page, 'secondary', '#E87924');
  await page.locator('#redo-palette').click();
  assert.equal((await jsonPalette(page)).secondary, undefined);
  assert.match(await page.locator('#sampling-role').textContent(), /Preview/);

  // Exact pixels, a fixed magnifier window, edge mapping, keyboard and thumb scrubbing.
  await upload(page, pixels); await statusContains(page, 'Picture ready');
  assert(await page.locator('#pick-primary').isDisabled(), 'Replacing the picture clears selection and assignment');
  const beforePixelPreview = await jsonPalette(page);
  await picture.click({position:{x:10.5,y:10.5}});
  assert.equal(await page.locator('#sample-hex').textContent(), '#646400');
  const lens = page.locator('#magnifier');
  await lens.click({position:{x:6,y:6}});
  assert.equal(await page.locator('#sample-hex').textContent(), '#323200');
  assert.deepEqual(await jsonPalette(page), beforePixelPreview, 'Unassigned grid exploration must leave the palette alone');
  await page.locator('#pick-primary').click(); await paletteHas(page, 'primary', '#323200');
  await lens.click({position:{x:126,y:126}}); await paletteHas(page, 'primary', '#969600');
  await lens.focus(); await page.keyboard.press('ArrowLeft'); await paletteHas(page, 'primary', '#8C9600');
  await lens.scrollIntoViewIfNeeded();
  const lensBox = await lens.boundingBox();
  await page.screenshot({path:path.join(artifacts,`${deployment}-pixels.png`)});
  const beforeScroll = await page.evaluate(() => scrollY);
  await lens.dispatchEvent('pointerdown', {pointerId:47,pointerType:'touch',isPrimary:true,buttons:1,clientX:lensBox.x+6,clientY:lensBox.y+6,bubbles:true,cancelable:true});
  for (let i=1;i<=10;i++) await lens.dispatchEvent('pointermove', {pointerId:47,pointerType:'touch',isPrimary:true,buttons:1,clientX:lensBox.x+6+i*12,clientY:lensBox.y+6+i*12,bubbles:true,cancelable:true});
  await lens.dispatchEvent('pointerup', {pointerId:47,pointerType:'touch',buttons:0,clientX:lensBox.x+126,clientY:lensBox.y+126,bubbles:true});
  await paletteHas(page, 'primary', '#969600');
  assert.equal(await page.evaluate(() => scrollY), beforeScroll, 'Scrubbing must not scroll the page');
  assert.equal(await lens.evaluate(e => getComputedStyle(e).touchAction), 'none');
  assert.equal(await page.locator('#picture-viewport').evaluate(e => getComputedStyle(e).touchAction), 'none');
  await page.locator('#undo-palette').click(); await paletteHas(page, 'primary', '#8C9600');
  await page.locator('#redo-palette').click(); await paletteHas(page, 'primary', '#969600');

  // Re-selecting one existing role's exact color permits direct refinement.
  const beforeExact = await jsonPalette(page);
  await picture.click({position:{x:15.5,y:15.5}});
  assert.deepEqual(await jsonPalette(page), beforeExact);
  assert.match(await page.locator('#sampling-role').textContent(), /Fine-tuning Primary/);
  await lens.focus(); await page.keyboard.press('ArrowRight'); await paletteHas(page, 'primary', '#A09600');
  await page.locator('#undo-palette').click(); await paletteHas(page, 'primary', '#969600');

  // Secondary refinement stays isolated, even after focusing a manual Primary field.
  await picture.click({position:{x:10.5,y:10.5}});
  await page.locator('#pick-secondary').click(); await paletteHas(page,'secondary','#646400');
  await lens.focus(); await page.keyboard.press('ArrowRight'); await paletteHas(page,'secondary','#6E6400');
  await paletteHas(page,'primary','#969600');
  await page.locator('#primary-hex').focus();
  await lens.focus(); await page.keyboard.press('ArrowDown'); await paletteHas(page,'secondary','#6E6E00');
  await paletteHas(page,'primary','#969600');
  await page.locator('#undo-palette').click(); await paletteHas(page,'secondary','#6E6400');
  assert.match(await page.locator('#sampling-role').textContent(), /Preview/);
  assert.equal(await page.locator('#image-status').textContent(), '');
  const recovered = await jsonPalette(page);
  await lens.focus(); await page.keyboard.press('ArrowDown');
  assert.deepEqual(await jsonPalette(page), recovered, 'Undo must break a stale refinement link');
  await page.locator('#pick-secondary').click();
  await page.locator('#remove-sample-secondary').click();
  const removed = await jsonPalette(page);
  await lens.focus(); await page.keyboard.press('ArrowLeft');
  assert.deepEqual(await jsonPalette(page), removed, 'Refining after removal must not silently recreate Secondary');

  // When both roles contain the same color, a fresh selection requires a role.
  const sameColor = await page.locator('#sample-hex').textContent();
  await page.locator('#pick-primary').click(); await page.locator('#pick-secondary').click();
  await paletteHas(page,'primary',sameColor); await paletteHas(page,'secondary',sameColor);
  await picture.click({position:{x:10.5,y:12.5}});
  assert.equal(await page.locator('#sample-hex').textContent(),sameColor);
  assert.match(await page.locator('#sampling-role').textContent(), /Preview.*not assigned/);
  const ambiguous = await jsonPalette(page);
  await lens.focus(); await page.keyboard.press('ArrowRight');
  assert.deepEqual(await jsonPalette(page),ambiguous,'An ambiguous match must never guess a role');
  await page.locator('#pick-secondary').click(); await paletteHas(page,'primary',sameColor);

  await page.locator('#open-history').click();
  assert(await page.locator('[data-history-color="#646400"]').isVisible(), 'A color passed during the drag must be recoverable');
  await page.locator('#history-role').selectOption('primary');
  await page.locator('[data-history-color="#646400"]').click(); await paletteHas(page, 'primary', '#646400');
  assert(await page.locator('[data-palette-key="c=969600"]').count(), 'An abandoned redo branch must remain in palette history');
  await page.locator('[data-palette-key="c=7C3AED&s=E87924"]').click();
  await paletteHas(page, 'primary', '#7C3AED'); await paletteHas(page, 'secondary', '#E87924');
  await page.locator('#close-history').click();
  await picture.click({position:{x:.5,y:.5}});
  await lens.click({position:{x:126,y:126}});
  await paletteHas(page,'primary','#7C3AED');
  await page.locator('#pick-primary').click(); await paletteHas(page, 'primary', '#646400');
  // Native pointer capture path, including mouse dragging outside the lens.
  await lens.scrollIntoViewIfNeeded();
  const captureBox = await lens.boundingBox();
  await page.mouse.move(captureBox.x+6,captureBox.y+6); await page.mouse.down();
  await page.mouse.move(captureBox.x+150,captureBox.y+150,{steps:10}); await page.mouse.up();
  await paletteHas(page, 'primary', '#646400');

  for (const width of [320,375,430]) {
    await page.setViewportSize({width,height:844});
    await noOverflow(page,`${deployment} loaded picture ${width}px`);
  }
  await page.setViewportSize({width:touch?390:1280,height:touch?844:900});

  // Valid manual edits propagate without an Apply/Generate step.
  await page.locator('#primary-hex').fill('#7C3AED'); await paletteHas(page, 'primary', '#7C3AED');
  await page.locator('#secondary-hex').fill('#8B5CF6'); await paletteHas(page, 'secondary', '#8B5CF6');
  assert.equal(await page.locator('#pairing-note').getAttribute('data-tone'),'warning');
  await page.locator('#secondary-hex').fill('#F97316'); await paletteHas(page, 'secondary', '#F97316');
  const manualPalette = await jsonPalette(page);
  await lens.focus(); await page.keyboard.press('ArrowLeft');
  assert.deepEqual(await jsonPalette(page), manualPalette, 'Manual color edits must break a stale image refinement link');
  await page.locator('#theme-links a').filter({hasText:/^Dark$/}).click();
  assert.equal(await page.locator('#secondary-hex').inputValue(),'#F97316');
  assert.equal(await picture.evaluate(e=>e.width),21);
  await page.locator('#view-palette').click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'result-heading');
  await visibleInViewport(page,'#undo-palette');

  await upload(page,partial); await statusContains(page,'Picture ready');
  await picture.click({position:{x:10,y:10}}); assert.equal(await page.locator('#sample-hex').textContent(),'#FF7F7F');
  await upload(page,transparent); await statusContains(page,'fully transparent');
  assert.equal(await page.locator('.suggestion').count(),0);
  await picture.click({position:{x:10,y:10}});
  assert(await page.locator('#pick-primary').isDisabled());
  assert(await page.locator('#pick-secondary').isDisabled());
  await upload(page,wide); await statusContains(page,'Picture ready'); assert.equal(await picture.evaluate(e=>e.width),2048);
  await upload(page,Buffer.from('not an image')); await statusContains(page,'Could not open');
  assert.equal(await picture.evaluate(e=>e.width),2048);

  await sources(page);
  if (!(await page.locator('#image-url-options').evaluate(e=>e.open))) await page.locator('#image-url-options summary').click();
  await page.locator('#image-url').fill(`${imageURL}/ok.png`); await page.locator('#image-url-form button').click();
  await statusContains(page,'Picture ready'); assert.equal(await picture.evaluate(e=>e.width),320);
  await sources(page); await page.locator('#image-url').fill(`${imageURL}/blocked.png`); await page.locator('#image-url-form button').click();
  await statusContains(page,'could not share'); assert.equal(await page.locator('#image-status').getAttribute('data-tone'),'error');
  await page.locator('#image-url').fill(`${imageURL}/slow.png`); await page.locator('#image-url-form button').click();
  await upload(page,partial); await statusContains(page,'Picture ready'); await page.waitForTimeout(350);
  assert.equal(await picture.evaluate(e=>e.width),40);
  await page.locator('#drop-zone').evaluate((element,bytes)=>{
    const data=new DataTransfer(); data.items.add(new File([new Uint8Array(bytes)],'drop.png',{type:'image/png'}));
    element.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data}));
  },[...photo]);
  await statusContains(page,'Picture ready'); assert.equal(await picture.evaluate(e=>e.width),320);

  // No system clipboard is read or overwritten by these isolated fixtures.
  await page.evaluate(bytes=>{
    const blob=new Blob([new Uint8Array(bytes)],{type:'image/png'});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{read:async()=>[{types:['image/png'],getType:async()=>blob}]}});
  },[...partial]);
  await sources(page); await page.locator('#paste-picture').click(); await statusContains(page,'Picture ready');
  assert.equal(await picture.evaluate(e=>e.width),40);
  await page.locator('#primary-hex').evaluate((input,bytes)=>{
    const data=new DataTransfer(); data.items.add(new File([new Uint8Array(bytes)],'clipboard.png',{type:'image/png'}));
    if(input.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}))) throw new Error('Image paste was not handled');
  },[...photo]);
  await statusContains(page,'Picture ready'); assert.equal(await picture.evaluate(e=>e.width),320);
  assert(await page.locator('#primary-hex').evaluate(input=>{
    const data=new DataTransfer(); data.setData('text/plain','#123456');
    return input.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
  }));
  await page.evaluate(()=>{navigator.clipboard.read=async()=>{throw new DOMException('Denied','NotAllowedError')}});
  await sources(page); await page.locator('#paste-picture').click(); await statusContains(page,'Clipboard access was blocked');
  assert.equal(await page.locator('#image-status').getAttribute('data-tone'),'warning');
  await upload(page,Buffer.alloc(20*1024*1024+1)); await statusContains(page,'larger than 20 MB');
  assert.equal(await picture.evaluate(e=>e.width),320);

  // Session history survives reload; images deliberately remain ephemeral.
  const previousSecondary = await page.locator('#secondary-hex').inputValue();
  await page.locator('#primary-hex').fill('#112233'); await paletteHas(page,'primary','#112233');
  await page.locator('#secondary-controls').evaluate(e=>e.open=true);
  await page.locator('#secondary-hex').fill('#445566'); await paletteHas(page,'secondary','#445566');
  await page.locator('#secondary-hex').blur();
  // Browser Back/Forward must agree with the editor's recovery controls.
  await page.goBack();
  await paletteHas(page,'primary','#112233'); await paletteHas(page,'secondary',previousSecondary);
  await page.goForward();
  await paletteHas(page,'primary','#112233'); await paletteHas(page,'secondary','#445566');
  await page.reload(); await ready(page);
  await paletteHas(page,'primary','#112233'); await paletteHas(page,'secondary','#445566');
  assert(await page.locator('#picture-placeholder').isVisible());
  await page.locator('#open-history').click();
  assert(await page.locator('[data-history-color="#646400"]').count());
  assert(await page.locator('[data-palette-key="c=7C3AED&s=E87924"]').count());
  await page.locator('#close-history').click();
  await page.locator('.curated-options summary').click(); await page.locator('#curated-id').selectOption('12');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('.json-view pre').textContent).basis.includes('customized'));

  // Lazy static exports and native exports contain the current live state.
  const expected=await jsonPalette(page);
  for(const kind of ['json','pdf']) {
    const pending=page.waitForEvent('download');
    await page.locator(`.downloads .${kind}`).click();
    const download=await pending;
    const destination=path.join(artifacts,`${deployment}.${kind}`);
    await download.saveAs(destination);
    const bytes=await fs.readFile(destination);
    if(kind==='json') assert.deepEqual(JSON.parse(bytes),expected);
    else assert(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));
  }
  for(const width of [320,375,390,430,768,1280]) {await page.setViewportSize({width,height:844});await noOverflow(page,`${deployment} ${width}px`);}
  await page.setViewportSize({width:touch?390:1280,height:touch?844:900});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(artifacts,`${deployment}-${touch?'mobile':'desktop'}.png`)});
  // Both base colors must be named in the shared title and exported files.
  await page.goto(new URL('?c=BA2C86&s=26E8C1',baseURL).href); await ready(page);
  const named = await jsonPalette(page);
  assert.equal(named.name,'Magenta #BA2C86 + Teal (Vivid) #26E8C1');
  assert.equal(await page.locator('#result-heading').textContent(),named.name);
  for (const kind of ['json','pdf']) {
    const pending=page.waitForEvent('download');await page.locator(`.downloads .${kind}`).click();
    const download=await pending;
    assert(download.suggestedFilename().includes('teal-vivid-26e8c1'),'Filename must name the secondary color');
    const destination=path.join(artifacts,`${deployment}-named.${kind}`);await download.saveAs(destination);
    if(kind==='json') assert.equal(JSON.parse(await fs.readFile(destination,'utf8')).name,named.name);
  }
  await noOverflow(page,`${deployment} named pair`);
  assert.deepEqual(errors,[],`${deployment} browser errors`);
  await context.close();
  console.log(`PASS ${deployment}: safe previews, explicit assignments, isolated live refinement, precise pixels, thumb drag, recovery, shared image frame, sources and exports`);
}

let chrome, safari;
try {
  chrome = await chromium.launch({headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  safari = await webkit.launch({headless: true});
  for (const [name, url] of [['server', nativeURL], ['static', staticURL]]) {
    await runFlow(chrome, `chromium-${name}`, url, false);
    await runFlow(safari, `webkit-${name}`, url, true);
  }
  const noJS = await chrome.newContext({javaScriptEnabled: false, viewport: {width: 320, height: 800}});
  const page = await noJS.newPage();
  await page.goto(nativeURL);
  await page.locator('#primary-hex').fill('#7C3AED');
  await page.locator('#secondary-controls summary').click();
  await page.locator('#secondary-hex').fill('#E87924');
  await page.locator('#manual-apply').click();
  exactAnchor((await jsonPalette(page)).secondary[0], '#E87924');
  await noOverflow(page, 'no JavaScript');
  await noJS.close();
  const exported = await (await fetch(`${nativeURL}palette.json?c=7C3AED&s=E87924`)).json();
  exactAnchor(exported.primary[0], '#7C3AED'); exactAnchor(exported.secondary[0], '#E87924');
  console.log('PASS native GET forms without JavaScript and JSON endpoint');
} finally {
  await chrome?.close(); await safari?.close();
  native.kill(); await new Promise(resolve => staticServer.close(resolve));
  await new Promise(resolve => imageServer.close(resolve));
}
