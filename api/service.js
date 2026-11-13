import {createHandler} from '../server/core.js';
const handler=createHandler();
export default function service(req,res){
  if(req.method==='GET'&&req.query?.action==='count'){
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Location','/api/count');
    return res.status(308).end();
  }
  return handler(req,res);
}
