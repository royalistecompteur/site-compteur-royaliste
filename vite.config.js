import {defineConfig} from 'vite';
import {createHandler} from './server/core.js';
export default defineConfig({plugins:[{name:'local-demo-api',configureServer(server){server.middlewares.use('/api',(req,res)=>{const url=new URL(req.url,'http://localhost');req.query=url.pathname==='/count'?{action:'count'}:Object.fromEntries(url.searchParams);res.status=code=>{res.statusCode=code;return res;};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};return createHandler({})(req,res);});}}]});
