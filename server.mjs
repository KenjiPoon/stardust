import http from 'node:http';
import {readFile,writeFile,unlink,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const id=createHash('sha256').update(root).digest('hex').slice(0,16);
const runtime=path.join(tmpdir(),`stardust-${id}.json`);
const app='stardust-local-v1';
const openBrowser=url=>{if(process.platform==='darwin'){const child=spawn('open',['-a','Google Chrome',url],{stdio:'ignore'});child.on('error',()=>console.log(`請在 Chrome 開啟 ${url}`));}};
let existing;
try{const state=JSON.parse(await readFile(runtime,'utf8'));const reply=await fetch(`http://127.0.0.1:${state.port}/__health`,{signal:AbortSignal.timeout(1000)});const health=await reply.json();if(health.app===app&&health.id===id&&health.instance===state.instance)existing=state;}catch{}
if(process.argv.includes('--stop')){
  if(existing){await fetch(`http://127.0.0.1:${existing.port}/__shutdown`,{method:'POST',headers:{'X-Stardust-Token':existing.token},signal:AbortSignal.timeout(2000)});console.log('宇宙星塵已停止。');}else console.log('宇宙星塵目前未有運行。');
  process.exit(0);
}
if(existing){const url=`http://127.0.0.1:${existing.port}`;console.log(`宇宙星塵已在運行：${url}`);if(process.argv.includes('--open'))openBrowser(url);process.exit(0);}
const token=randomBytes(24).toString('hex'),instance=randomBytes(12).toString('hex');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm','.task':'application/octet-stream','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.md':'text/plain; charset=utf-8'};
let closing=false;const eventClients=new Set();
async function cleanup(){try{const state=JSON.parse(await readFile(runtime,'utf8'));if(state.instance===instance)await unlink(runtime);}catch{}}
function shutdown(){if(closing)return;closing=true;for(const client of eventClients){client.write('event: stop\ndata: {}\n\n');client.end();}server.close();setTimeout(()=>{server.closeAllConnections();cleanup().finally(()=>process.exit(0));},180);}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
  res.setHeader('Permissions-Policy','camera=(self), microphone=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  const allowedHost=`127.0.0.1:${server.address().port}`;
  if(req.headers.host!==allowedHost){res.writeHead(403);res.end('只允許本機連線');return;}
  if(req.url==='/__events'&&req.method==='GET'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': stardust ready\n\n');eventClients.add(res);
    const heartbeat=setInterval(()=>res.write(': local heartbeat\n\n'),20000);
    req.on('close',()=>{eventClients.delete(res);clearInterval(heartbeat);});return;
  }
  if(req.url==='/__health'&&req.method==='GET'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({app,id,instance}));return;}
  if(req.url==='/__shutdown'&&req.method==='POST'){
    const supplied=Buffer.from(req.headers['x-stardust-token']||'');const expected=Buffer.from(token);
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){res.writeHead(403);res.end();return;}
    res.end('已停止');setTimeout(shutdown,100);return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const filename=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
    if(!filename.startsWith(root+path.sep)||pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);res.end();return;}
    const info=await stat(filename);if(!info.isFile())throw new Error('Not a file');
    res.setHeader('Content-Type',mime[path.extname(filename)]||'application/octet-stream');
    res.setHeader('Content-Length',info.size);res.setHeader('Cache-Control',pathname.startsWith('/vendor/')||pathname.startsWith('/models/')?'public, max-age=86400':'no-cache');
    if(req.method==='HEAD'){res.end();return;}const source=createReadStream(filename);source.on('error',()=>res.destroy());source.pipe(res);
  }catch{res.writeHead(404);res.end('找不到檔案');}
});
let port=Number(process.env.STARDUST_PORT)||43127;
for(let i=0;i<20;i++,port++){
  try{await new Promise((resolve,reject)=>{const onError=e=>reject(e);server.once('error',onError);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',onError);resolve();});});break;}
  catch(error){if(error.code!=='EADDRINUSE'||i===19)throw error;}
}
await writeFile(runtime,JSON.stringify({port,pid:process.pid,token,instance}),{mode:0o600});
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
console.log(`宇宙星塵已開啟：http://127.0.0.1:${port}\n影像只在本機處理。\n停止方法：雙擊「停止宇宙星塵.command」，或在此視窗按 Control+C。`);
if(process.argv.includes('--open'))openBrowser(`http://127.0.0.1:${port}`);
