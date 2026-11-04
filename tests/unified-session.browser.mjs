// 四个独立前端的同源联调：真实会话/CSRF/角色 guard，账号和日志全部使用隔离夹具。
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { createRequire } from 'node:module'
const projects = resolve(import.meta.dirname, '../..')
const require = createRequire(resolve(projects, 'xiaofeiyu-inbox/package.json'))
const { chromium } = require('playwright')
const backend = process.env.AUTH_FIXTURE_BACKEND || resolve(projects, 'tuanzi-server-base')
const origin='http://127.0.0.1:52511', apiOrigin='http://127.0.0.1:52510'
const child=spawn(process.execPath,[resolve(backend,'scripts/admin-console-fixture.cjs')],{cwd:backend,env:{...process.env,FIXTURE_PORT:'52510',FIXTURE_AUTH_ORIGIN:origin},stdio:['ignore','pipe','pipe']})
let browser
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin)
  if(url.pathname.startsWith('/api/')){
   if(url.pathname.startsWith('/api/auth/')||url.pathname.startsWith('/api/admin/')){
    const proxy=http.request(apiOrigin+req.url,{method:req.method,headers:{...req.headers,host:'127.0.0.1:52510'}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res)})
    proxy.on('error',()=>{res.writeHead(503);res.end()});req.pipe(proxy);return
   }
   const auth=await fetch(apiOrigin+'/api/auth/session',{headers:{cookie:req.headers.cookie||''}})
   const privatePath=url.pathname.includes('xiaofeiyu')||url.pathname.includes('stock-watchlist')
   if(privatePath&&!auth.ok){res.writeHead(401,{'Content-Type':'application/json'});res.end('{"message":"请登录"}');return}
   let data={items:[],total:0,page:1,limit:30,totalPages:0,allTotal:0,unread:0,hasMore:false}
   if(url.pathname.endsWith('/dates'))data=[]
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));return
  }
  const mapping=[['/xunshi/','xunshi'],['/xiaofeiyu/','xiaofeiyu-inbox'],['/admin/','tuanzi-admin']]
  const match=mapping.find(([prefix])=>url.pathname.startsWith(prefix))
  const root=resolve(projects,match?.[1]||'personal-homepage','dist')
  const relative=decodeURIComponent(match?url.pathname.slice(match[0].length):url.pathname.slice(1))
  let file=resolve(root,relative||'index.html')
  if(!file.startsWith(root+sep)){res.writeHead(404);res.end();return}
  try{if(!(await stat(file)).isFile())throw Error()}catch{file=resolve(root,'index.html')}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file))
 }catch(error){console.error(error.message);res.writeHead(500);res.end()}
})
try{
 await Promise.race([new Promise(resolve=>child.stdout.on('data',data=>{if(String(data).includes('Integration fixture ready'))resolve()})),new Promise((_,reject)=>{child.once('exit',code=>reject(new Error('Fixture exited '+code)));setTimeout(()=>reject(new Error('Fixture startup timeout')),15000).unref()})])
 await new Promise(resolve=>server.listen(52511,'127.0.0.1',resolve))
 browser=await chromium.launch({headless:true})
 const context=await browser.newContext({viewport:{width:1440,height:1000}})
 const home=await context.newPage(), errors=[]
 context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)))
 home.on('pageerror',error=>errors.push(error.message))
 await home.goto(origin+'/login?returnTo=%2Fapps')
 await home.getByLabel('邮箱或用户名',{exact:true}).fill('integration-user')
 await home.getByLabel('密码',{exact:true}).fill('integration-only')
 await home.getByRole('button',{name:'登录并继续',exact:true}).click()
 await home.waitForURL('**/apps')
 await home.getByRole('heading',{name:'integration-user，欢迎回来。'}).waitFor()
 assert.equal(await home.locator('.workspace-projects a[href="/admin/"]').count(),0)
 assert.equal(await home.locator('.workspace-projects a[href="/dsh/"]').count(),0)
 const diary=await context.newPage();await diary.goto(origin+'/xiaofeiyu/')
 await diary.getByRole('button',{name:'退出',exact:true}).waitFor()
 const stocks=await context.newPage();await stocks.goto(origin+'/xunshi/watchlist')
 await stocks.locator('.account-box').getByText('integration-user',{exact:true}).waitFor()
 const admin=await context.newPage();await admin.goto(origin+'/admin/logs')
 await admin.getByRole('heading',{name:'当前账号没有后台管理权限'}).waitFor()
 assert.equal((await context.request.get(origin+'/api/auth/session')).status(),200)
 assert.equal(await home.evaluate(()=>localStorage.getItem('accessToken')),null)
 assert.equal(await home.evaluate(()=>document.cookie.includes('tuanzi_dev_session')),false)
 await diary.getByRole('button',{name:'退出',exact:true}).click()
 await diary.getByRole('link',{name:'前往统一登录 →'}).waitFor()
 await home.waitForURL('**/login?**')
 await stocks.getByRole('heading',{name:'登录，开始你的长期观察'}).waitFor()
 await home.getByLabel('邮箱或用户名',{exact:true}).fill('integration-admin')
 await home.getByLabel('密码',{exact:true}).fill('integration-only')
 await home.getByRole('button',{name:'登录并继续',exact:true}).click()
 await home.waitForURL('**/apps')
 await home.locator('.workspace-projects a[href="/admin/"]').waitFor()
 const other=await browser.newContext();const second=await other.newPage();await second.goto(origin+'/login')
 await second.getByLabel('邮箱或用户名',{exact:true}).fill('integration-admin');await second.getByLabel('密码',{exact:true}).fill('integration-only');await second.getByRole('button',{name:'登录并继续',exact:true}).click();await second.waitForURL('**/apps')
 await home.getByRole('button',{name:'退出所有设备',exact:true}).click();await home.waitForURL('**/login**')
 await second.reload();await second.waitForURL('**/login?**')
 assert.deepEqual(errors,[])
 console.log('PASS: one login across four independent frontends, role denial without logout, HttpOnly/no local tokens, cross-tab logout, admin grants and all-device revocation.')
}finally{
 await browser?.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections()});child.kill('SIGTERM');await once(child,'exit').catch(()=>{})
}
