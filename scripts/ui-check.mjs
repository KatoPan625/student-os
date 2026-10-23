import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'output/playwright/ui-check');
await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url);
const webpackPackage=require('next/dist/compiled/webpack/webpack');
const compiler=webpackPackage.webpack({
  mode:'development',devtool:false,
  entry:path.join(root,'tests/ui/fixture.tsx'),
  output:{path:output,filename:'bundle.js'},
  resolve:{extensions:['.tsx','.ts','.js'],alias:{
    '@/app/(student)/actions$':path.join(root,'tests/ui/actions.ts'),
    '@/app/login/actions$':path.join(root,'tests/ui/actions.ts'),
    '@/app/(student)/assistant-actions$':path.join(root,'tests/ui/actions.ts'),
    'next/navigation$':path.join(root,'tests/ui/navigation.ts'),
    'next/link$':path.join(root,'tests/ui/link.tsx'),
    '@':path.join(root,'src'),
  }},
  module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(root,'scripts/ui-loader.mjs')}]},
});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>{
  if(error||stats?.hasErrors())reject(error??new Error(stats.toString({all:false,errors:true})));
  else resolve();
}));
await new Promise((resolve,reject)=>compiler.close(error=>error?reject(error):resolve()));
assert.ok((await readFile(path.join(output,'bundle.js'))).length>0);
await writeFile(path.join(output,'index.html'),'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Student OS — kiểm tra UI</title><link rel="stylesheet" href="/styles.css"><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
if(!process.argv.includes('--build-only')) createServer(async(request,response)=>{
  const route=new URL(request.url??'/','http://localhost').pathname;
  const file=route==='/bundle.js'?path.join(output,'bundle.js'):route==='/styles.css'?path.join(root,'src/app/globals.css'):path.join(output,'index.html');
  response.setHeader('Content-Type',route==='/bundle.js'?'text/javascript':route==='/styles.css'?'text/css':'text/html; charset=utf-8');
  try{response.end(await readFile(file));}catch{response.writeHead(500);response.end('UI fixture unavailable');}
}).listen(3101,'127.0.0.1',()=>console.log('UI fixture: http://127.0.0.1:3101 — dữ liệu tổng hợp, action luôn báo lỗi; không phải backend thật.'));
