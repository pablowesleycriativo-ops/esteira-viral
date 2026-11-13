import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

async function check(origin, label) {
  const page = await browser.newPage()
  const logs = []
  page.on('pageerror', (error) => logs.push(String(error)))
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await page.goto(`${origin}/#/formatos`, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => document.body.innerText.includes('Formatos'))
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForFunction(() => navigator.serviceWorker.controller)

  const stored = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('esteira-viral')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const state = await new Promise((resolve, reject) => {
      const request = db.transaction('kv', 'readonly').objectStore('kv').get('state')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return state.formats.find((format) => format.id === 'fmt-1').image
  })
  if (stored !== null) throw new Error(`${label}: imagem salva não é nula`)

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('No catálogo'))
    button?.click()
  })
  await page.waitForFunction(() => [...document.querySelectorAll('img')].some((img) => img.src.includes('01-bombado')))
  if (label === 'raiz') {
    await page.screenshot({ path: '/opt/cursor/artifacts/formatos-ilustracoes.png' })
  }

  const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
  await page.evaluate(async (pixelUrl) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('esteira-viral')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const state = await new Promise((resolve, reject) => {
      const request = db.transaction('kv', 'readonly').objectStore('kv').get('state')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    state.formats.find((format) => format.id === 'fmt-1').image = pixelUrl
    await new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite')
      tx.objectStore('kv').put(state, 'state')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }, pixel)
  await page.reload({ waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    ;[...document.querySelectorAll('button')].find((item) => item.textContent?.includes('No catálogo'))?.click()
  })
  await page.waitForFunction(() => [...document.querySelectorAll('img')].some((img) => img.src.startsWith('data:image/gif')))

  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('esteira-viral')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const state = await new Promise((resolve, reject) => {
      const request = db.transaction('kv', 'readonly').objectStore('kv').get('state')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    state.formats.find((format) => format.id === 'fmt-1').image = null
    await new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite')
      tx.objectStore('kv').put(state, 'state')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    ;[...document.querySelectorAll('button')].find((item) => item.textContent?.includes('No catálogo'))?.click()
  })
  await page.waitForFunction(() => [...document.querySelectorAll('img')].some((img) => img.src.includes('01-bombado')))

  await page.goto(`${origin}/#/formatos`, { waitUntil: 'networkidle0' })
  await page.setOfflineMode(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.body.innerText.includes('Personagem Bombado Transformation'), { timeout: 8000 })
  const offlineImg = await page.evaluate(() => [...document.querySelectorAll('img')].some((img) => img.complete && img.naturalWidth > 0 && img.src.includes('01-bombado')))
  if (!offlineImg) throw new Error(`${label}: ilustração não carregou offline`)
  await page.setOfflineMode(false)
  if (logs.length) throw new Error(logs.join('\n'))
  await page.close()
  console.log(label, 'ok')
}

await check('http://127.0.0.1:4371', 'raiz')
await check('http://127.0.0.1:4373/esteira-viral', 'subpasta')
await browser.close()
