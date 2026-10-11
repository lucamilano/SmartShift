// Isolated browser checks of calendar, onboarding and invitation states with mock server actions.
// Run: node scripts/check-calendar-ui.mjs (Edge on Windows, or CALENDAR_BROWSER executable).
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve('.')
const output = resolve('node_modules/.cache/calendar-audit')
await mkdir(output, { recursive: true })
const date = new Date()
const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const fixture = [{ id: 'fixture', data: today, tipo: 'smartworking', mezza_giornata: true }]
await build({
  stdin: {
    contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import Calendar from './src/app/dashboard/calendario/calendar-client';
      import FirstAccess from './src/app/primo-accesso/first-access-form';
      import Login from './src/app/login/login-form';
      import Team from './src/app/dashboard/team/team-client';
      import {ModalAccessibility} from './src/components/modal-accessibility';
      const path=location.pathname;
      if(path.startsWith('/first-access')) window.fetch=async()=>{if(window.fixtureOffline)throw Error('offline');return new Response(JSON.stringify({error:'Servizio non disponibile. Riprova.'}),{status:503,headers:{'Content-Type':'application/json'}})};
      if(path==='/team-fixture') Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.fixtureCopied=text}}});
      const content=path.startsWith('/first-access') ? <FirstAccess email={'collega.con.indirizzo.molto.lungo@azienda.example.test'} expired={path.endsWith('expired')} />
        : path==='/login-fixture' ? <Login />
        : path==='/team-fixture' ? <main id="main-content" className="mobile-readable" style={{maxWidth:1024,margin:'auto',padding:16}}><Team initialMembers={[{id:'fixture-user',email:'collega.con.indirizzo.molto.lungo@azienda.example.test',nome:'Nome molto lungo del collega',cognome:'Cognome composto molto lungo',ruolo:'user',must_change_password:true,invitation_status:'failed'}]} todaysEvents={[]} stats={{ufficio:0,smartworking:0,permesso:0,ferie:0,malattia:0,assenti_non_giustificati:1}} /></main>
        : <main id="main-content" className="mobile-readable" style={{maxWidth:1024,margin:'auto',padding:16}}><h1>Calendario</h1><Calendar initialEvents={${JSON.stringify(fixture)}} initialTeamSchedule={[]} targetUserId="fixture-user" /></main>;
      createRoot(document.getElementById('root')).render(<><ModalAccessibility />{content}</>);
    `,
    resolveDir: root, loader: 'tsx',
  },
  bundle: true, outfile: resolve(output, 'app.js'), platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'calendar-fixtures', setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'stub' }))
    builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'stub' }))
    builder.onResolve({ filter: /^@\/lib\/auth-client$/ }, () => ({ path: 'auth', namespace: 'stub' }))
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path === 'navigation'
      ? 'export function useRouter(){return {replace(){},refresh(){},push(){}}}'
      : args.path === 'link' ? "import React from 'react';export default function Link(props){return React.createElement('a',props)}"
      : 'export const authClient={signOut:async()=>({}),signIn:{email:async()=>({error:{status:401}})}}', loader: 'js', resolveDir: root }))
    builder.onResolve({ filter: /^\.\/actions$/ }, args => /(?:calendar|team)-client\.tsx$/.test(args.importer) ? { path: args.importer.endsWith('team-client.tsx') ? 'team' : 'calendar', namespace: 'fixture' } : undefined)
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'team' ? `
      export async function updateProfile(){throw Error('offline')}
      export async function deleteUserAction(){return {success:true}}
      export async function createUserAction(){return {warning:'Account creato, invio email non riuscito. Usa la password temporanea.',temporaryPassword:'PasswordFittiziaSoloTest123'}}
      export async function resendInvitationAction(){return {error:'Invio email non riuscito.',temporaryPassword:'PasswordFittiziaSoloTest123'}}
    ` : `
      let events=${JSON.stringify(fixture)};
      window.fixtureFailure=false; window.fixtureWrites=[]; window.fixtureDeletes=[];
      export async function getUserEvents(start,end){ if(window.fixtureFailure)throw Error('offline'); return events.filter(e=>e.data>=start&&e.data<=end) }
      export async function getTeamSchedule(start,end){ return events.filter(e=>e.data>=start&&e.data<=end).map(e=>({...e,utente_id:'fixture-user',email:'collega@example.test',nome:'Nome molto lungo del collega',cognome:'Cognome',ruolo:'user'})) }
      export async function addEvents(dates,tipo,mezza_giornata){window.fixtureWrites.push(dates);events.push(...dates.map(data=>({id:data,data,tipo,mezza_giornata})));return {success:true}}
      export async function deleteEvent(id){window.fixtureDeletes.push(id);events=events.filter(e=>e.id!==id);return {success:true}}
    `, loader: 'js' }))
  } }],
})
const css = await postcss([tailwind()]).process(await readFile('src/app/globals.css', 'utf8'), { from: resolve('src/app/globals.css') })
await writeFile(resolve(output, 'style.css'), css.css)
const axe = await readFile(resolve('node_modules/axe-core/axe.min.js'))
const html = '<!doctype html><html lang="it" style="--font-geist-sans:Arial;--font-geist-mono:monospace"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Verifica interfaccia</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script><script src="/axe.js"></script></body></html>'
const server = createServer(async (request, response) => {
  if (request.url === '/axe.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(axe); return }
  if (request.url === '/app.js' || request.url === '/style.css') {
    response.setHeader('Content-Type', request.url.endsWith('.css') ? 'text/css' : 'text/javascript')
    response.end(await readFile(resolve(output, request.url.slice(1))))
    return
  }
  response.setHeader('Content-Type', 'text/html'); response.end(html)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = spawn(process.env.CALENDAR_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9337', `--user-data-dir=${resolve(output, 'browser-profile')}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserError = ''
browser.stderr.on('data', data => { browserError += data.toString() })
browser.on('error', error => { browserError += error.message })
let socket
let closeBrowser
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
  let pages
  for (let i = 0; i < 80; i++) {
    try { pages = await (await fetch('http://127.0.0.1:9337/json', { signal: AbortSignal.timeout(500) })).json(); if (pages.some(page => page.type === 'page')) break } catch { /* Starting browser. */ }
    await pause(100)
  }
  assert(pages, `Browser debugging endpoint did not start: ${browserError.slice(-2000)}`)
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl)
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', message => {
    const result = JSON.parse(message.data)
    if (result.method === 'Runtime.exceptionThrown') console.log('Fixture browser error:', result.params.exceptionDetails.exception?.description || result.params.exceptionDetails.text)
    if (result.id) { const callback = pending.get(result.id); pending.delete(result.id); callback?.(result) }
  })
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const call = ++id
    pending.set(call, result => result.error ? reject(Error(result.error.message)) : resolve(result.result))
    socket.send(JSON.stringify({ id: call, method, params }))
  })
  closeBrowser = () => cdp('Browser.close')
  await cdp('Runtime.enable')
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description)
    return result.result.value
  }
  const click = async text => {
    await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length && !b.disabled && (b.textContent.trim()===${JSON.stringify(text)} || b.getAttribute('aria-label')===${JSON.stringify(text)}));if(!button)throw Error('Button missing: '+${JSON.stringify(text)});button.focus();button.click()})()`)
    await pause(180)
  }
  const audit = async name => {
    assert.equal(await evaluate("!!document.querySelector('h1')"), true, `${name}: component did not render`)
    const overflow = await evaluate('document.documentElement.scrollWidth > innerWidth')
    assert.equal(overflow, false, `${name}: horizontal overflow`)
    const clippedDialogs = await evaluate("[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect()).filter(r=>r.left< -1||r.top< -1||r.right>innerWidth+1||r.bottom>innerHeight+1).map(r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom}))")
    assert.deepEqual(clippedDialogs, [], `${name}: dialog outside viewport`)
    const violations = await evaluate(`axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))`)
    assert.deepEqual(violations, [], `${name}: ${JSON.stringify(violations)}`)
    console.log(`PASS ${name}: reflow + axe WCAG A/AA`)
  }
  for (const [width, height] of [[320, 740], [390, 844], [568, 320], [844, 390], [768, 1024], [1280, 900]]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` })
    await pause(700)
    await audit(`Calendar ${width}x${height} light`)
    if (width === 390) {
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(resolve(output, 'agenda-mobile.png'), Buffer.from(screenshot.data, 'base64'))
    }
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Calendar ${width}x${height} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
    if (width > 639) continue
    assert.equal(await evaluate("document.querySelectorAll('ul[aria-label] > li').length"), 7, await evaluate('document.body.innerText'))
    const undersized = await evaluate("[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.disabled).filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent)")
    assert.deepEqual(undersized, [], 'Mobile targets below 44px')
    await click('Team (1)')
    await audit(`Team sheet ${width}`)
    await click('Chiudi')
    await click('Dettagli')
    await audit(`Day sheet ${width}`)
    await click('Rimuovi')
    await audit(`Delete confirmation ${width}`)
    await click('Annulla')
    assert.equal(await evaluate('window.fixtureDeletes.length'), 0, 'Cancel preserves event')
    await click('Rimuovi')
    await click('Conferma')
    assert.equal(await evaluate('window.fixtureDeletes.length'), 1, 'Confirmed removal deletes event')
    await click('Pianifica')
    if (await evaluate("Boolean(document.querySelector('[role=alertdialog]'))")) await click('Conferma')
    await click('Mezza giornata')
    await click('Conferma')
    assert.equal(await evaluate('window.fixtureWrites[0].length'), 1, 'Single-day creation')
    await click('Più giorni')
    await click('Seleziona giorno')
    await click('Mese successivo')
    await evaluate("(()=>{const buttons=[...document.querySelectorAll('ul[aria-label] button')].filter(b=>b.textContent.trim()==='Seleziona giorno'&&!b.disabled);const button=buttons.at(-1);button.focus();button.click()})()")
    await pause(180)
    await click('Continua')
    await audit(`Editor ${width}`)
    if (width === 390) {
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(resolve(output, 'editor-mobile.png'), Buffer.from(screenshot.data, 'base64'))
    }
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Editor ${width} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
    // Native radio arrows must change the selected activity.
    await evaluate("document.querySelector('input[value=smartworking]').focus()")
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
    assert.equal(await evaluate("document.querySelector('input[value=permesso]').checked"), true)
    await click('Conferma')
    assert.equal(await evaluate('window.fixtureWrites[1].length'), 2)
    assert.equal(await evaluate('new Set(window.fixtureWrites[1].map(date=>date.slice(0,7))).size'), 2, 'Batch spans two months')
    assert.equal(await evaluate("document.activeElement.textContent.trim()"), 'Più giorni', 'Focus restored after batch save')
    await click('Mese')
    await audit(`Month ${width}`)
    await evaluate('window.fixtureFailure=true')
    await click('Mese successivo')
    assert.equal(await evaluate("document.querySelector('[role=alert]').textContent.includes('Impossibile')"), true)
    await evaluate('window.fixtureFailure=false')
    await click('Riprova')
    assert.equal(await evaluate("document.querySelector('[role=alert]')===null"), true)
    console.log(`PASS mobile flows ${width}: multi-month save, radio keyboard, focus restoration, loading failure + retry`)
  }
  const visitFixture = async path => {
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}${path}` })
    await pause(500)
  }
  const fillFixture = async (id, value) => {
    await evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});input.focus();input.value='';input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
    await cdp('Input.insertText', { text: value })
  }
  for (const [width, height] of [[320, 740], [390, 844], [568, 320], [844, 390], [768, 1024], [1280, 900]]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await visitFixture('/first-access')
    await audit(`First access ${width} light`)
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`First access ${width} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
    await fillFixture('currentPassword', 'TemporaneaTest123')
    await fillFixture('newPassword', 'NuovaPasswordTest123')
    await fillFixture('confirm', 'DiversaPasswordTest123')
    await click('Imposta nuova password')
    assert.equal(await evaluate('document.activeElement.id'), 'confirm')
    await audit(`First access mismatch ${width}`)
    await fillFixture('confirm', 'NuovaPasswordTest123')
    await evaluate('window.fixtureOffline=true')
    await click('Imposta nuova password')
    assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Imposta nuova password'&&!b.disabled)"), true)
    await audit(`First access network failure ${width}`)
    await click('Mostra nuova password')
    assert.equal(await evaluate("document.getElementById('newPassword').type"), 'text')
    await click('Nascondi nuova password')
    await visitFixture('/first-access-expired')
    await audit(`Expired invitation ${width} light`)
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Expired invitation ${width} dark`)
    await visitFixture('/login-fixture')
    await audit(`Login fixture ${width} light`)
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Login fixture ${width} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
    await fillFixture('email', 'fixture@example.test')
    await fillFixture('password', 'PasswordSoloTest123')
    await click('Accedi')
    await audit(`Login error ${width}`)
    await visitFixture('/team-fixture')
    await audit(`Team long names ${width} light`)
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Team long names ${width} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
    await click('Reinvia invito')
    await audit(`Invitation fallback ${width}`)
    await click('Copia password')
    assert.equal(await evaluate('typeof window.fixtureCopied'), 'string')
    await audit(`Password copy feedback ${width}`)
    await click('Ho capito')
    await evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.getAttribute('aria-label')?.startsWith('Modifica dati'));button.focus();button.click()})()")
    await pause(180)
    await click('Salva modifiche')
    await audit(`Edit network failure ${width}`)
    await click('Ho capito')
    assert.equal(await evaluate("document.getElementById('nome').disabled"), false)
    await click('Annulla')
  }
} finally {
  if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), pause(1000)])
  socket?.close()
  browser.kill()
  server.close()
}
