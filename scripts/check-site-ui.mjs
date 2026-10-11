// Runs against a local dev server. Opens forms and confirmations without saving real data.
// Reads local provisioning credentials without printing them. SITE_LOGIN_FILE overrides the file.
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const origin = process.env.SITE_URL || 'http://127.0.0.1:3000'
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Use a local server')
const output = resolve('node_modules/.cache/site-audit')
await mkdir(output, { recursive: true })
let credentialFile = process.env.SITE_LOGIN_FILE
if (!credentialFile) {
  const files = await readdir('.wrangler/private')
  const candidates = await Promise.all(files.filter(file => /^local-login-.*\.txt$/.test(file)).map(async file => ({ file: resolve('.wrangler/private', file), time: (await stat(resolve('.wrangler/private', file))).mtimeMs })))
  credentialFile = candidates.sort((a, b) => b.time - a.time)[0]?.file
}
assert(credentialFile, 'Provision a local admin first, or set SITE_LOGIN_FILE')
const credentials = await readFile(credentialFile, 'utf8')
const email = credentials.match(/^Email: (.+)$/m)?.[1].trim()
const password = credentials.match(/^Password: (.+)$/m)?.[1].trim()
assert(email && password, 'Local credentials are incomplete')
const axe = await readFile(resolve('node_modules/axe-core/axe.min.js'), 'utf8')
const browser = spawn(process.env.CALENDAR_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9338',
  `--user-data-dir=${resolve(output, 'browser-profile')}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' })
let socket, closeBrowser
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let count = 0
try {
  let pages
  for (let i = 0; i < 60; i++) {
    try { pages = await (await fetch('http://127.0.0.1:9338/json', { signal: AbortSignal.timeout(500) })).json(); if (pages.some(page => page.type === 'page')) break } catch { /* Starting. */ }
    await pause(100)
  }
  assert(pages, 'Browser did not start')
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', message => {
    const result = JSON.parse(message.data)
    if (result.id) { const callback = pending.get(result.id); pending.delete(result.id); callback?.(result) }
  })
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const call = ++id
    const timeout = setTimeout(() => { pending.delete(call); reject(Error(`Timed out: ${method}`)) }, 30000)
    pending.set(call, result => { clearTimeout(timeout); if (result.error) reject(Error(result.error.message)); else resolve(result.result) })
    socket.send(JSON.stringify({ id: call, method, params }))
  })
  closeBrowser = () => cdp('Browser.close')
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
    return result.result.value
  }
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) {
      try { if (await evaluate(expression)) return } catch { /* Navigating. */ }
      await pause(200)
    }
    throw Error('Timed out waiting for UI')
  }
  const visit = async path => {
    await cdp('Page.navigate', { url: origin + path })
    await waitFor(`location.pathname===${JSON.stringify(path)} && document.readyState==='complete' && !!document.querySelector('h1')`)
    await pause(350)
    await evaluate(axe)
  }
  const press = async (key, code, windowsVirtualKeyCode) => {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode })
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode })
    await pause(100)
  }
  const click = async text => {
    await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&!b.disabled&&(b.textContent.trim()===${JSON.stringify(text)}||b.getAttribute('aria-label')===${JSON.stringify(text)}));if(!b)throw Error('Missing button');b.focus();b.click()})()`)
    await pause(200)
  }
  const fill = async (id, value) => {
    await evaluate(`document.getElementById(${JSON.stringify(id)}).focus()`)
    await cdp('Input.insertText', { text: value })
  }
  const openSelect = async id => {
    await evaluate(`document.getElementById(${JSON.stringify(id)}).focus()`)
    await press(' ', 'Space', 32)
    await waitFor("!!document.querySelector('[role=listbox]')")
  }
  const audit = async name => {
    const overflow = await evaluate('document.documentElement.scrollWidth>innerWidth')
    const overflowNodes = overflow ? await evaluate("[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,40)})).slice(0,8)") : []
    assert.equal(overflow, false, `${name}: overflow ${JSON.stringify(overflowNodes)}`)
    const clipped = await evaluate("[...document.querySelectorAll('[role=dialog],[role=alertdialog],[role=listbox]')].filter(e=>e.getClientRects().length).map(e=>({role:e.getAttribute('role'),r:e.getBoundingClientRect(),translate:getComputedStyle(e).translate,transform:getComputedStyle(e).transform,animation:getComputedStyle(e).animationName,cls:e.className})).filter(({r})=>r.left< -1||r.top< -1||r.right>innerWidth+1||r.bottom>innerHeight+1).map(({role,r,translate,transform,animation,cls})=>({role,left:r.left,top:r.top,right:r.right,bottom:r.bottom,translate,transform,animation,cls}))")
    assert.deepEqual(clipped, [], `${name}: clipped overlays`)
    const violations = await evaluate(`axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))`)
    assert.deepEqual(violations, [], `${name}: ${JSON.stringify(violations)}`)
    const weakBorders = await evaluate(`(()=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
      const luminance=rgb=>{const c=rgb.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
      const color=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return luminance([...ctx.getImageData(0,0,1,1).data])};
      const background=element=>{ctx.clearRect(0,0,1,1);const chain=[];for(let node=element;node;node=node.parentElement)chain.unshift(node);for(const node of chain){ctx.fillStyle=getComputedStyle(node).backgroundColor;ctx.fillRect(0,0,1,1)}return luminance([...ctx.getImageData(0,0,1,1).data])};
      const ratio=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      return [...document.querySelectorAll('input:not([type=radio]),button[role=combobox],[data-variant=outline]')].filter(e=>e.getClientRects().length&&!e.disabled&&!e.closest('[inert]')).map(e=>{const border=color(getComputedStyle(e).borderTopColor);return {id:e.id,ratio:Math.min(ratio(border,background(e)),ratio(border,background(e.parentElement)))}}).filter(e=>e.ratio<3);
    })()`)
    assert.deepEqual(weakBorders, [], `${name}: control boundaries below 3:1`)
    count++
    console.log(`PASS ${name}`)
  }
  const screenshot = async name => {
    const result = await cdp('Page.captureScreenshot', { format: 'png' })
    await writeFile(resolve(output, `${name}.png`), Buffer.from(result.data, 'base64'))
  }
  await cdp('Network.enable')
  await cdp('Network.clearBrowserCookies')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false })
  for (const [width, height] of [[320, 740], [390, 844], [568, 320], [768, 1024], [1024, 768], [1280, 900]]) {
    if (process.env.SITE_WIDTH && width !== Number(process.env.SITE_WIDTH)) continue
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await visit('/login')
    await audit(`Login ${width} light`)
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Login ${width} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
  }
  await fill('email', email); await fill('password', password)
  await click('Accedi')
  await waitFor("location.pathname==='/dashboard' && !!document.querySelector('h1')")
  for (const [width, height] of [[320, 740], [390, 844], [568, 320], [768, 1024], [1024, 768], [1280, 900]]) {
    if (process.env.SITE_WIDTH && width !== Number(process.env.SITE_WIDTH)) continue
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    for (const path of ['/dashboard', '/dashboard/calendario', '/dashboard/team', '/dashboard/account', '/dashboard/esporta']) {
      await visit(path)
      await audit(`${path} ${width} light`)
      await evaluate("document.documentElement.classList.add('dark')")
      await audit(`${path} ${width} dark`)
      await evaluate("document.documentElement.classList.remove('dark')")
      if (path === '/dashboard/team') {
        await click('Nuovo collega')
        await audit(`New colleague ${width}`)
        if (width === 390) await screenshot('new-colleague-mobile')
        await fill('newNome', 'Verifica'); await fill('newCognome', 'Interfaccia'); await fill('newEmail', 'email-invalida')
        await evaluate("document.querySelector('[role=dialog] form').requestSubmit()")
        assert.equal(await evaluate("document.getElementById('newEmail').validity.typeMismatch"), true)
        // Simulates an on-screen keyboard shrinking only the visual viewport.
        await evaluate("Object.defineProperty(window.visualViewport,'height',{configurable:true,get:()=>300});window.visualViewport.dispatchEvent(new Event('resize'))")
        await pause(200)
        await audit(`New colleague visual viewport 300 ${width}`)
        assert.equal(await evaluate("(()=>{const input=document.getElementById('newEmail').getBoundingClientRect();const footer=document.querySelector('[role=dialog] .dialog-footer').getBoundingClientRect();return input.top>=0&&input.bottom<=footer.top+1})()"), true, 'Keyboard: focused email stays above actions')
        if (width === 390) await screenshot('new-colleague-keyboard-mobile')
        await evaluate("delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'))")
        await pause(200)
        await click('Annulla')
        assert.equal(await evaluate("document.activeElement.textContent.trim()"), 'Nuovo collega')
        await evaluate("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.getAttribute('aria-label')?.startsWith('Modifica dati'));if(!b)throw Error('No local member');b.focus();b.click()})()")
        await pause(200)
        await audit(`Edit colleague ${width}`)
        await openSelect('editRuolo')
        await audit(`Role options ${width}`)
        await press('Escape', 'Escape', 27)
        await click('Annulla')
        await evaluate("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.getAttribute('aria-label')?.startsWith('Rimuovi account'));b.focus();b.click()})()")
        await pause(200)
        await audit(`Delete colleague confirmation ${width}`)
        await click('Annulla')
      }
      if (path === '/dashboard/esporta') {
        await openSelect('export-month')
        await audit(`Month options ${width}`)
        await press('Escape', 'Escape', 27)
        await openSelect('export-year')
        await audit(`Year options ${width}`)
        await press('Escape', 'Escape', 27)
        await cdp('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
        await click('Scarica file Excel')
        await waitFor("!!document.querySelector('[role=alert]')")
        await audit(`Export network failure ${width}`)
        await cdp('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
        assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Scarica file Excel'&&!b.disabled)"), true)
      }
      if (path === '/dashboard/account') {
        await fill('currentPassword', 'Test-ui-no-request'); await fill('newPassword', 'NuovaPasswordA123'); await fill('confirm', 'NuovaPasswordB123')
        await click('Aggiorna password')
        assert.equal(await evaluate("document.querySelector('[role=status]').textContent.includes('non coincidono')"), true)
        await audit(`Password mismatch ${width}`)
      }
    }
  }
  console.log(`PASS ${count} site states: reflow, overlay bounds, WCAG A/AA; no application data saved`)
} finally {
  if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), pause(1000)])
  socket?.close(); browser.kill()
}
