import {Request, Response} from 'express'
import {ClientRequestArgs, IncomingMessage, ServerResponse} from 'http'
import * as http from 'http'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as url from 'url'
import * as express from 'express'
import * as colors from 'colors'

const urlReg = /\.(pkg|pup)$/
const dataDir = path.join(__dirname, '../data')
const app = express()

export const server = http.createServer(app)

app.use(onRequest)

async function onRequest(req: Request, res: Response) {
  const filename = path.basename(req.url)
  const file = path.join(dataDir, filename)
  if (await fs.pathExists(file)) {
    console.log(colors.green(`cache hit ${req.url}`))
    fs.createReadStream(file).pipe(res)
    return
  }

  if (req.url.match(urlReg)) {
    console.log(colors.rainbow(`need cache ${req.url}`))
  } else {
    console.log(colors.gray(`proxying ${req.url}`))
  }
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
