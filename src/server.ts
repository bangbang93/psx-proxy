import {ClientRequestArgs, IncomingMessage, ServerResponse} from 'http'
import * as http from 'http'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as url from 'url'

const urlReg = /\.(pkg|pup)$/
const dataDir = path.join(__dirname, '../data')

export const server = http.createServer()

server.on('request', onRequest)

async function onRequest(req: IncomingMessage, res: ServerResponse) {
  const filename = path.basename(req.url)
  const file = path.join(dataDir, filename)
  if (await fs.pathExists(file)) {
    fs.createReadStream(file).pipe(res)
  } else {
    const parsed: ClientRequestArgs = url.parse(req.url)
    parsed.port = parsed.port || '80'
    parsed.headers = req.headers
    const proxyReq = http.request(parsed)
    proxyReq.on('response', (proxyRes: IncomingMessage) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    })

    req.pipe(proxyReq)
  }
}
