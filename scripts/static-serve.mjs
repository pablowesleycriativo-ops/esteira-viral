import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = process.argv[2]
const prefix = process.argv[3] && process.argv[3] !== '/' ? process.argv[3].replace(/\/$/, '') : ''
const port = Number(process.argv[4])

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  let path = decodeURIComponent(url.pathname)
  if (prefix && path !== prefix && !path.startsWith(`${prefix}/`)) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  let rel = prefix ? path.slice(prefix.length) : path
  if (!rel || rel === '') rel = '/'
  if (rel.endsWith('/')) rel += 'index.html'
  const file = normalize(join(root, rel))
  if (!file.startsWith(normalize(root))) {
    res.writeHead(403)
    res.end('forbidden')
    return
  }
  try {
    const info = statSync(file)
    if (info.isDirectory()) {
      res.writeHead(302, { Location: `${path}/` })
      res.end()
      return
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
    createReadStream(file).pipe(res)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
}).listen(port, '127.0.0.1')
