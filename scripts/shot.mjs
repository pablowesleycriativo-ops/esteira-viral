import puppeteer from 'puppeteer-core'

const base = 'http://127.0.0.1:4317'
const out = '/opt/cursor/artifacts'
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

async function shot(name) {
  await new Promise((r) => setTimeout(r, 250))
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log('shot', name, await page.title(), page.url())
}

async function text() {
  return page.evaluate(() => document.body.innerText)
}

const errors = []
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(`${base}/#/`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('Esteira Viral'))
await shot('01-inicio')

await page.goto(`${base}/#/formatos`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('Personagem Bombado Transformation'))
await shot('02-formatos')
await page.click('button[aria-pressed="false"]')
const pressed = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button')]
  const teste = buttons.find((button) => button.textContent?.includes('Em teste'))
  teste?.click()
  return teste?.textContent ?? ''
})
console.log('filter', pressed)
await page.waitForFunction(() => document.body.innerText.includes('Veneno do Dr. Harlow'))
if ((await text()).includes('Modelando Clay')) console.log('FAIL filter still shows clay')
else console.log('ok filter hides rebaixados')

await page.goto(`${base}/#/formatos/fmt-1`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('4,0'))
await shot('03-formato')

await page.goto(`${base}/#/personagens`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('Dr. Harlow'))
await shot('04-personagens')

await page.goto(`${base}/#/personagens/chr-harlow`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('A avaliar'))
await shot('05-personagem')

await page.goto(`${base}/#/videos`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('diário está vazio'))
await shot('06-videos')

await page.goto(`${base}/#/sistema`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('Ramificação'))
await shot('07-sistema')

await page.goto(`${base}/#/ideia`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('6 elementos'))
await shot('08-ideia')

await page.goto(`${base}/#/ajustes`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('Exportar JSON'))
await shot('09-ajustes')

await page.evaluate(() => {
  const input = document.querySelector('input[inputmode="decimal"]')
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(input, '5000')
  input.dispatchEvent(new Event('input', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 400))

await page.goto(`${base}/#/videos/novo`, { waitUntil: 'networkidle0' })
const selects = await page.$$('select')
await selects[0].select('fmt-1')
await selects[1].select('chr-sonic')
await page.evaluate(() => {
  const set = (name, value) => {
    const label = [...document.querySelectorAll('label')].find((item) => item.innerText.startsWith(name))
    const input = label?.querySelector('input, textarea')
    if (!input) throw new Error(name)
    const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
  set('Título', 'Gancho do Sonic')
  set('Views em 48h', '1000')
  set('APV (%)', '40')
  set('Viewed vs swiped (%)', '70')
  set('Inscritos', '2')
  set('% de busca', '12')
  set('Lição', 'Abertura lenta perde o loop.')
})
await page.locator('button[type="submit"]').click()
await page.waitForFunction(() => document.body.innerText.includes('Hook falhou'))
const after = await text()
console.log('below', after.includes('Abaixo da média'))
console.log('search dx', after.includes('Tráfego de busca'))
console.log('subs dx', after.includes('não fideliza'))
await shot('10-diagnostico')

await page.goto(`${base}/#/formatos/fmt-1`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.body.innerText.includes('Nota real: a avaliar'))
console.log('nota real stays a avaliar with 1 video')

const ready = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready
  return Boolean(reg.active)
})
console.log('sw', ready)
await page.setOfflineMode(true)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => document.body.innerText.includes('Esteira Viral'), { timeout: 8000 })
console.log('offline ok', (await text()).includes('Bombado') || (await text()).includes('Nota real'))
await page.setOfflineMode(false)

if (errors.length) console.log('page errors', errors)
await browser.close()
