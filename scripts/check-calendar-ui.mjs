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
        : <main id="main-content" className="mobile-readable" style={{maxWidth:1152,margin:'auto',padding:16}}><h1>Calendario</h1><Calendar initialEvents={window.fixtureInitialEvents || ${JSON.stringify(fixture)}} initialTeamSchedule={[]} targetUserId="fixture-user" /></main>;
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
      const dense=new URLSearchParams(location.search).has('dense');
      const dayString=day=>[day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
      const now=new Date();
      let events=dense ? ['ufficio','smartworking','permesso','ferie','malattia'].map((tipo,i)=>({id:'dense-'+i,data:dayString(new Date(now.getFullYear(),now.getMonth(),i+1)),tipo,mezza_giornata:i%2===1})) : ${JSON.stringify(fixture)};
      window.fixtureInitialEvents=events;
      window.fixtureFailure=false; window.fixtureDeleteFailure=false; window.fixtureSaveFailure=false; window.fixtureWrites=[]; window.fixtureDeletes=[]; window.fixtureReads=[];
      export async function getUserEvents(start,end){window.fixtureReads.push({start,end});if(window.fixtureFailure)throw Error('offline');return events.filter(e=>e.data>=start&&e.data<=end)}
      export async function getTeamSchedule(start,end){
        const team=events.filter(e=>e.data>=start&&e.data<=end).flatMap(e=>Array.from({length:dense?12:1},(_,i)=>({...e,tipo:dense?['ufficio','smartworking','permesso','ferie','malattia'][i%5]:e.tipo,utente_id:i?'colleague-'+i:'fixture-user',email:'collega@example.test',nome:'Nome molto lungo del collega',cognome:'Cognome composto molto lungo '+i,ruolo:'user'})));
        if(dense)team.push({data:dayString(new Date(now.getFullYear(),now.getMonth(),12)),tipo:'ufficio',mezza_giornata:false,utente_id:'team-only',email:'team@example.test',nome:'Collega',cognome:'Pianificato senza turno personale',ruolo:'user'});
        return team.filter(e=>e.data>=start&&e.data<=end)
      }
      export async function addEvents(dates,tipo,mezza_giornata){if(window.fixtureSaveFailure)return {error:'Impossibile salvare la pianificazione. Riprova.'};window.fixtureWrites.push(dates);events.push(...dates.map(data=>({id:data,data,tipo,mezza_giornata})));return {success:true}}
      export async function deleteEvent(id){if(window.fixtureDeleteFailure)return {error:'Impossibile rimuovere la pianificazione. Riprova.'};window.fixtureDeletes.push(id);events=events.filter(e=>e.id!==id);return {success:true}}
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
  const fixedDate = new URL(request.url, 'http://localhost').searchParams.get('date')
  const clockScript = fixedDate && /^\d{4}-\d{2}-\d{2}$/.test(fixedDate) ? `<script>{const NativeDate=Date;const instant=new NativeDate(${JSON.stringify(fixedDate + 'T12:00:00')}).getTime();window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[instant]))}static now(){return instant}}}</script>` : ''
  response.setHeader('Content-Type', 'text/html'); response.end(html.replace('<script src="/app.js">', clockScript + '<script src="/app.js">'))
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
let auditCount = 0
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
    await evaluate(`(()=>{const button=[...document.querySelectorAll('button, summary')].find(b=>b.getClientRects().length && !b.disabled && !b.closest('[inert]') && (b.textContent.trim()===${JSON.stringify(text)} || b.getAttribute('aria-label')===${JSON.stringify(text)}));if(!button)throw Error('Control missing: '+${JSON.stringify(text)});button.focus();button.click()})()`)
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
    auditCount++
    console.log(`PASS ${name}: reflow + axe WCAG A/AA`)
  }
  const auditGrid = async expectedCount => {
    const grid = await evaluate("(()=>{const days=[...document.querySelectorAll('[data-calendar-date]')];const heights=days.map(e=>e.getBoundingClientRect().height);return {count:days.length,first:days[0].dataset.calendarDate,last:days.at(-1).dataset.calendarDate,min:Math.min(...heights),max:Math.max(...heights),narrowest:Math.min(...days.map(e=>e.getBoundingClientRect().width)),nested:days.some(e=>e.querySelector('button,a,input'))}})()")
    if (expectedCount) assert.equal(grid.count, expectedCount, 'Month has the expected number of complete weeks')
    assert.equal(grid.count % 7, 0, 'Month completes every week')
    assert.equal(new Date(grid.first + 'T12:00:00').getDay(), 1, 'Month grid starts on Monday')
    assert.equal(new Date(grid.last + 'T12:00:00').getDay(), 0, 'Month grid ends on Sunday')
    assert(grid.max - grid.min < 1, 'Day rows have uniform heights')
    assert(grid.narrowest >= 24 && grid.min >= 44, 'Compact days retain AA target size and generous height')
    assert.equal(grid.nested, false, 'Day controls do not nest interactive elements')
    const range = await evaluate('window.fixtureReads.at(-1)')
    assert(range.start <= grid.first && range.end >= grid.last, 'Data loading covers adjacent month days')
  }
  const auditDayDetails = async (width, height) => {
    assert.equal(await evaluate("document.activeElement.matches('[data-slot=dialog-title]')"), true, `Day details focus their title: ${JSON.stringify(await evaluate("({active:document.activeElement.outerHTML,dialogs:document.querySelectorAll('[role=dialog]').length})"))}`)
    assert.deepEqual(await evaluate("[...document.querySelectorAll('[role=dialog] dl dd')].map(e=>e.textContent.trim())"), ['Smartworking', 'Mezza giornata'], 'Day details prioritize activity and duration')
    const removal = await evaluate("(()=>{const b=[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Rimuovi pianificazione');const r=b.getBoundingClientRect();return {width:r.width,height:r.height,variant:b.dataset.variant}})()")
    assert(removal.width >= 44 && removal.height >= 44, 'Removal target at least 44px')
    assert.equal(removal.variant, 'ghost', 'Removal uses a secondary visual treatment')
    await audit(`Day details ${width}x${height} light`)
    if (width === 390 || width === 1440) {
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(resolve(output, `day-details-${width}.png`), Buffer.from(screenshot.data, 'base64'))
    }
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Day details ${width}x${height} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
    for (let index = 0; index < 5; index++) {
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
      assert.equal(await evaluate("!!document.activeElement.closest('[role=dialog]')"), true, 'Tab focus stays inside day details')
    }
  }
  const auditDeleteConfirmation = async width => {
    assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Annulla', 'Confirmation initially focuses cancel')
    assert.equal(await evaluate("document.querySelector('[data-slot=alert-dialog-action]').dataset.variant"), 'destructive', 'Only the final removal action is destructive')
    await audit(`Delete confirmation ${width} light`)
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Delete confirmation ${width} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
  }
  const calendarViewports = [[320, 740], [375, 812], [390, 844], [430, 932], [568, 320], [768, 1024], [844, 390], [1024, 768], [1440, 900], [1920, 1080]]
  const denseOnly = process.argv.includes('--dense-only')
  const requestedWidth = Number(process.argv.find(argument => argument.startsWith('--width='))?.split('=')[1]) || null
  const selectedViewports = calendarViewports.filter(([width]) => !requestedWidth || width === requestedWidth)
  assert(selectedViewports.length > 0, 'Requested width is not covered by the calendar audit')
  for (const [width, height] of denseOnly ? [] : selectedViewports) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await cdp('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` })
    await pause(700)
    await audit(`Calendar ${width}x${height} light`)
    const entry = await evaluate("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.getAttribute('aria-label')?.startsWith('Dettagli e rimozione'));return b&&{label:b.getAttribute('aria-label'),popup:b.getAttribute('aria-haspopup')}})()")
    assert(entry?.label.includes(String(date.getDate())), 'Planned day names its details and removal action')
    assert.equal(entry.popup, 'dialog', 'Day management announces a dialog')
    if (width === 1440) {
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(resolve(output, 'month-desktop.png'), Buffer.from(screenshot.data, 'base64'))
    }
    if (width === 390) {
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(resolve(output, 'agenda-mobile.png'), Buffer.from(screenshot.data, 'base64'))
    }
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Calendar ${width}x${height} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
    if (width >= 768) {
      await auditGrid()
      assert.equal(await evaluate("[...document.querySelectorAll('.calendar-day-menu')].some(e=>e.getClientRects().length)"), true, 'Planned days visibly signal contextual actions without hover')
      assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&b.getAttribute('aria-label')?.startsWith('Rimuovi'))"), false, 'Removal stays in day details')
      // Clicking the visible hint opens the day; it must not remove the event directly.
      const hint = await evaluate("(()=>{const e=[...document.querySelectorAll('[data-calendar-date]')].find(e=>e.getClientRects().length&&e.getAttribute('aria-label').startsWith('Dettagli e rimozione'));e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...hint, button: 'left', clickCount: 1 })
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...hint, button: 'left', clickCount: 1 })
      await pause(180)
      assert.equal(await evaluate(`document.querySelector('[data-calendar-date="${today}"]').getAttribute('aria-expanded')`), 'true', 'Day trigger exposes the open state')
      assert.equal(await evaluate("!!document.querySelector('[role=dialog]')"), true, 'Visible day action opens details by pointer')
      assert.equal(await evaluate('window.fixtureDeletes.length'), 0, 'Opening day management preserves event')
      await click('Chiudi')
      await evaluate(`(()=>{const button=[...document.querySelectorAll('button[aria-label]')].find(b=>b.getClientRects().length&&b.getAttribute('aria-label').includes('Smartworking'));button.focus()})()`)
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' })
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
      await pause(180)
      await auditDayDetails(width, height)
      await click('Rimuovi pianificazione')
      await auditDeleteConfirmation(width)
      await click('Annulla')
      assert.equal(await evaluate('window.fixtureDeletes.length'), 0, 'Cancel preserves event')
      assert.equal(await evaluate("document.activeElement.textContent.trim()"), 'Rimuovi pianificazione', 'Cancel restores removal focus')
      await click('Rimuovi pianificazione')
      await click('Rimuovi')
      assert.equal(await evaluate('window.fixtureDeletes.length'), 1, 'Confirmed removal deletes event')
      assert.equal(await evaluate("document.activeElement.matches('[data-slot=dialog-title]')"), true, 'Removal restores focus to surviving detail title')
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await pause(180)
      assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')?.includes('nessuna pianificazione')"), true, 'Day focus restored after removal')
      continue
    }
    assert.equal(await evaluate("document.querySelectorAll('ul[aria-label=" + JSON.stringify('Giornate della settimana') + "] > li').length"), 7, await evaluate('document.body.innerText'))
    const undersized = await evaluate("[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.disabled).filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent)")
    assert.deepEqual(undersized, [], 'Mobile targets below 44px')
    await click('Mese')
    assert.equal(await evaluate("[...document.querySelectorAll('[data-calendar-date]')].some(e=>e.getClientRects().length&&e.getAttribute('aria-label').startsWith('Dettagli e rimozione')&&e.querySelector('.calendar-status svg'))"), true, 'Compact month marks planned days with a semantic icon and accessible actions')
    assert.equal(await evaluate("document.getElementById('calendar-month-help').textContent.includes('Rimuovi pianificazione')"), true, 'Month explains the removal path')
    await audit(`Planned month ${width} light`)
    await auditGrid()
    if (width === 390) {
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(resolve(output, 'month-mobile.png'), Buffer.from(screenshot.data, 'base64'))
    }
    await evaluate("document.documentElement.classList.add('dark')")
    await audit(`Planned month ${width} dark`)
    await evaluate("document.documentElement.classList.remove('dark')")
    await evaluate("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.getAttribute('aria-label')?.startsWith('Dettagli e rimozione'));b.focus();b.click()})()")
    await pause(180)
    assert.equal(await evaluate("!!document.querySelector('[role=dialog]')"), true, 'Compact planned day opens management')
    assert.equal(await evaluate('window.fixtureDeletes.length'), 0, 'Opening compact day preserves event')
    await click('Chiudi')
    await click('Agenda')
    await click('Team (1)')
    await audit(`Team sheet ${width}`)
    await click('Chiudi')
    await click('Dettagli e rimozione')
    await auditDayDetails(width, height)
    await click('Rimuovi pianificazione')
    await auditDeleteConfirmation(width)
    await click('Annulla')
    assert.equal(await evaluate('window.fixtureDeletes.length'), 0, 'Cancel preserves event')
    assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Rimuovi pianificazione', 'Cancel restores removal focus')
    if (width === 390) {
      await evaluate('window.fixtureDeleteFailure=true')
      await click('Rimuovi pianificazione')
      await click('Rimuovi')
      await audit('Removal failure 390')
      await click('Ho capito')
      assert.equal(await evaluate('window.fixtureDeletes.length'), 0, 'Failed removal preserves event')
      assert.equal(await evaluate("document.querySelector('[role=dialog] dl dd').textContent.trim()"), 'Smartworking', 'Failed removal retains day details')
      assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Rimuovi pianificazione', 'Failure restores removal focus for retry')
      await evaluate('window.fixtureDeleteFailure=false')
    }
    await click('Rimuovi pianificazione')
    await click('Rimuovi')
    assert.equal(await evaluate('window.fixtureDeletes.length'), 1, 'Confirmed removal deletes event')
    assert.equal(await evaluate("document.activeElement.matches('[data-slot=dialog-title]')"), true, 'Removal restores focus to surviving detail title')
    await click('Pianifica')
    if (await evaluate("Boolean(document.querySelector('[role=alertdialog]'))")) await click('Conferma')
    if (width === 390) {
      await evaluate('window.fixtureSaveFailure=true')
      await click('Conferma')
      await audit('Save failure 390')
      await click('Ho capito')
      assert.equal(await evaluate('window.fixtureWrites.length'), 0, 'Save failure leaves event unsaved')
      assert.equal(await evaluate("!!document.querySelector('[data-calendar-editor]')"), true, 'Save failure keeps editor available for retry')
      await evaluate('window.fixtureSaveFailure=false')
    }
    await click('Mezza giornata')
    await click('Conferma')
    assert.equal(await evaluate('window.fixtureWrites[0].length'), 1, 'Single-day creation')
    await click('Più giorni')
    assert.equal(await evaluate("[...document.querySelectorAll('.calendar-day-menu')].some(e=>e.getClientRects().length)"), false, 'Selection mode hides management hints')
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
  // Deterministic month boundaries and dense states use a fixture clock only.
  const monthCases = [['2021-02-01', 28], ['2026-04-01', 35], ['2026-03-01', 42]]
  for (const [width, height] of selectedViewports.filter(([width]) => width !== 568 && width !== 844)) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    for (const [fixedDate, count] of monthCases) {
      await visitFixture(`/calendar-fixture?date=${fixedDate}&dense=1`)
      if (width < 768) await click('Mese')
      await auditGrid(count)
      for (const theme of ['light', 'dark']) {
        await evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'})`)
        await audit(`Dense month ${fixedDate} ${width} ${theme}`)
        const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
        await writeFile(resolve(output, `month-${count / 7}-weeks-${width}-${theme}.png`), Buffer.from(screenshot.data, 'base64'))
      }
      await evaluate("document.documentElement.classList.remove('dark')")
    }
    const labels = ['In ufficio', 'Smartworking', 'Permesso', 'Ferie', 'Malattia']
    for (let index = 0; index < labels.length; index++) {
      const dateKey = `2026-03-${String(index + 1).padStart(2, '0')}`
      await evaluate(`(()=>{const b=document.querySelector('[data-calendar-date="${dateKey}"]');b.scrollIntoView({block:'center'});b.focus();b.click()})()`)
      await pause(180)
      assert.equal(await evaluate("document.querySelector('[role=dialog] dl dd').textContent.trim()"), labels[index], 'Day summary matches the semantic state')
      assert.equal(await evaluate("[...document.querySelectorAll('[role=dialog] dl dd')].at(-1).textContent.trim()"), index % 2 ? 'Mezza giornata' : 'Giornata intera', 'Day summary preserves duration')
      await click('Team (12)')
      assert.equal(await evaluate("document.querySelectorAll('[role=dialog] .calendar-people > li').length"), 12, 'Team remains available with multiple states and long names')
      for (const theme of ['light', 'dark']) {
        await evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'})`)
        await audit(`Dense details ${labels[index]} ${width} ${theme}`)
      }
      await evaluate("document.documentElement.classList.remove('dark')")
      await click('Chiudi')
      assert.equal(await evaluate('document.activeElement.dataset.calendarDate'), dateKey, 'Dense day restores its trigger focus')
    }
    await evaluate("(()=>{const b=document.querySelector('[data-calendar-date=\"2026-03-12\"]');b.focus();b.click()})()")
    await pause(180)
    assert.equal(await evaluate("document.querySelector('[role=dialog] dl')"), null, 'Team-only day does not invent a personal event')
    await click('Team (1)')
    assert.equal(await evaluate("document.querySelector('[role=dialog] .calendar-people > li').textContent.includes('Pianificato senza turno personale')"), true, 'Team is available on a personally unplanned day')
    await audit(`Team-only empty day ${width}`)
    await click('Chiudi')
    if (width === 390) {
      // Real browser touch dispatch, followed by a live viewport change.
      await cdp('Emulation.setTouchEmulationEnabled', { enabled: true })
      const point = await evaluate("(()=>{const e=document.querySelector('[data-calendar-date=\"2026-03-02\"]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
      await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
      await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await pause(200)
      assert.equal(await evaluate("document.querySelector('[data-calendar-day-details]').dataset.calendarDayDetails"), 'sheet', 'Touch opens the day sheet')
      await cdp('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false })
      await pause(250)
      await audit('Open day resized to desktop')
      assert.equal(await evaluate("document.querySelector('[data-calendar-day-details]').dataset.calendarDayDetails"), 'popover', 'Resize preserves selection in contextual popover')
      assert.equal(await evaluate("document.activeElement.matches('[data-slot=dialog-title]')"), true, 'Resize retains focus inside new panel')
      await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
      await pause(250)
      await audit('Open day resized to phone')
      assert.equal(await evaluate("document.querySelector('[data-calendar-day-details]').dataset.calendarDayDetails"), 'sheet')
      await click('Chiudi')
      await cdp('Emulation.setTouchEmulationEnabled', { enabled: false })
    }
    if (width === 390 || width === 1440) {
      for (const [dateKey, title] of [['2026-04-05', 'Giorno festivo'], ['2026-04-04', 'Fine settimana']]) {
        await evaluate(`(()=>{const b=document.querySelector('[data-calendar-date="${dateKey}"]');b.focus();b.click()})()`)
        await pause(180)
        await click('Pianifica')
        assert.equal(await evaluate("document.querySelector('[role=alertdialog] [data-slot=alert-dialog-title]').textContent"), title, 'Adjacent holiday/weekend preserves business confirmation')
        await audit(`Adjacent ${title} ${width}`)
        await click('Annulla')
        assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Pianifica', 'Holiday cancellation restores the planning action')
        assert.equal(await evaluate('window.fixtureWrites.length'), 0, 'Holiday cancellation does not write')
        await click('Chiudi')
      }
      await evaluate("(()=>{const b=document.querySelector('[data-calendar-date=\"2026-04-05\"]');b.focus();b.click()})()")
      await pause(180)
      await click('Pianifica')
      await click('Conferma')
      await click('Conferma')
      assert.equal(await evaluate('window.fixtureWrites[0][0]'), '2026-04-05', 'Adjacent-day creation uses the correct month')
      assert.equal(await evaluate("document.querySelector('[data-calendar-date=\"2026-04-05\"]').getAttribute('aria-label').includes('Smartworking')"), true, 'Adjacent-day creation is reloaded in the grid')
    }
    if (width === 768) {
      await evaluate("document.querySelector('[data-calendar-date=\"2026-03-05\"]').focus()")
      for (const [key, expected] of [['ArrowRight', '2026-03-06'], ['ArrowDown', '2026-03-13'], ['ArrowLeft', '2026-03-12'], ['ArrowUp', '2026-03-05']]) {
        const code = { ArrowRight: 39, ArrowDown: 40, ArrowLeft: 37, ArrowUp: 38 }[key]
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code })
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code })
        assert.equal(await evaluate('document.activeElement.dataset.calendarDate'), expected, 'Grid arrow navigation moves by day/week')
      }
    }
  }
  const fillFixture = async (id, value) => {
    await evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});input.focus();input.value='';input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
    await cdp('Input.insertText', { text: value })
  }
  for (const [width, height] of denseOnly || requestedWidth ? [] : [[320, 740], [390, 844], [568, 320], [844, 390], [768, 1024], [1280, 900]]) {
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
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ complete: !denseOnly && !requestedWidth, passedAudits: auditCount, calendarViewports: selectedViewports, monthCases, themes: ['light', 'dark'], touchEmulation: selectedViewports.some(([width]) => width === 390), realDeviceChecks: false }, null, 2))
  console.log(`PASS ${denseOnly || requestedWidth ? 'focused' : 'complete'} audit: ${auditCount} UI states and calendar interactions`)
} finally {
  if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), pause(1000)])
  socket?.close()
  browser.kill()
  server.close()
}
