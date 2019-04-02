import * as colors from 'colors'
import * as express from 'express'
import {Request, Response} from 'express'
import * as fs from 'fs-extra'
import * as http from 'http'
import {ClientRequestArgs, IncomingMessage} from 'http'
import * as net from 'net'
import {Socket} from 'net'
import * as path from 'path'
import * as url from 'url'

const urlReg = /\.(pkg|pup)$/
const dataDir = path.join(__dirname, '../data')
export const app = express()

export const server = http.createServer(app)

app.all('*', onRequest)
server.on('connect', onConnect)

async function onRequest(req: Request, res: Response) {
  const {pathname} = url.parse(req.url)
  const filename = path.basename(pathname)
  const file = path.join(dataDir, filename)
  if (await fs.pathExists(file)) {
    console.log(colors.green(`cache hit ${req.url}`))
    res.sendFile(file)
    return
  }

  if (pathname.match(urlReg)) {
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

function onConnect(req: IncomingMessage, socket: Socket) {
  console.log(colors.gray(`connect ${req.url}`))

  const res = new http.ServerResponse(req)
  res.shouldKeepAlive = false
  res.chunkedEncoding = false
  res.assignSocket(socket)
  res.once('finish', () => {
    res.detachSocket(socket)
    socket.end()
  })

  const [host, port] = req.url.split(':')

  const target = net.connect(parseInt(port), host)
  target.on('connect', () => {
    res.writeHead(200)
    res['_send']('')
    socket.pipe(target)
    target.pipe(socket)
  })
  target.on('close', () => {
    socket.destroy()
    target.destroy()
  })
}
