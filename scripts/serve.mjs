import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.pdf':'application/pdf','.svg':'image/svg+xml','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
const server=http.createServer((req,res)=>{
  try{
    const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(route==='/'?'/index.html':route));
    if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':fs.statSync(file).size});
    fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(400);res.end('Invalid request');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'The app may already be running. Open http://127.0.0.1:4173':e.message);process.exitCode=1;});
server.listen(4173,'127.0.0.1',()=>{
  console.log('Exam Kyat Sar Search is ready: http://127.0.0.1:4173\nKeep this window open while using the app. Press Ctrl+C to stop.');
  if(process.argv.includes('--open')&&process.platform==='win32')spawn('cmd.exe',['/c','start','','http://127.0.0.1:4173'],{windowsHide:true});
});
