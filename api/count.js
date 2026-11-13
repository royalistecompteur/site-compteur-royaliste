import {createHandler} from '../server/core.js';
const handler=createHandler(process.env,fetch,{cachePublicCount:true});
export default function count(req,res) {
  // One canonical cache key; arbitrary query parameters must not fragment the cache.
  if (Object.keys(req.query||{}).length) {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Vercel-CDN-Cache-Control','no-store');
    return res.status(400).json({error:'Paramètres non acceptés.'});
  }
  req.query={action:'count'};
  return handler(req,res);
}
