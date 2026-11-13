// Run from your monitoring service. Logs no credentials or response bodies.
const origin=process.env.APP_ORIGIN;
const secret=process.env.CRON_SECRET;
if(!origin||!secret)throw Error('APP_ORIGIN and CRON_SECRET required');
const url=new URL('/api/service?action=status',origin);
if(url.protocol!=='https:')throw Error('HTTPS required');
try{
 const response=await fetch(url,{headers:{Authorization:`Bearer ${secret}`},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Unhealthy');
 const status=await response.json();if(status.healthy!==true)throw Error('Maintenance overdue');
 console.log('Service and scheduled cleanup healthy');
}catch{console.error('ALERT: service unavailable or cleanup overdue');process.exitCode=1;}
