import {createHandler} from '../server/core.js';

const handler=createHandler(process.env,fetch,{cachePublicCount:true});

export default function count(req,res) {
  // Vercel can populate req.query with its internal route parameters even
  // when a visitor requests /api/count without any query string.
  // Ignore these parameters: the counter does not accept query inputs.
  // The response is identical for every request, so this cannot influence
  // the total returned by the database.
  req.query={action:'count'};
  return handler(req,res);
}
