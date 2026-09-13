// Signed CI/deployment reporter. Never include secrets or commit diffs in payloads.
const {createHmac}=require('crypto');
async function main(){
 const {AUDIT_EVENT_URL,AUDIT_INGEST_SECRET,GITHUB_REPOSITORY,GITHUB_SHA,GITHUB_REF_NAME,GITHUB_ACTOR,GITHUB_RUN_ID,GITHUB_RUN_ATTEMPT}=process.env;
 if(!AUDIT_EVENT_URL||!AUDIT_INGEST_SECRET)throw new Error('Audit reporting endpoint and secret must be configured');
 const endpoint=new URL(AUDIT_EVENT_URL);if(endpoint.protocol!=='https:')throw new Error('Audit reporting requires HTTPS');
 const source=process.env.AUDIT_EVENT_SOURCE||'developer';
 const body=JSON.stringify({source,action:process.env.AUDIT_EVENT_ACTION||'push',outcome:process.env.AUDIT_EVENT_OUTCOME||'success',
  repository:GITHUB_REPOSITORY,commit:GITHUB_SHA,branch:GITHUB_REF_NAME,actor:GITHUB_ACTOR,provider:process.env.AUDIT_EVENT_PROVIDER||'GitHub Actions',
  event_id:process.env.AUDIT_EVENT_ID||`${GITHUB_REPOSITORY}:${GITHUB_RUN_ID}:${GITHUB_RUN_ATTEMPT}:${source}`});
 const timestamp=String(Math.floor(Date.now()/1000));
 const signature=createHmac('sha256',AUDIT_INGEST_SECRET).update(`${timestamp}.${body}`).digest('hex');
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Audit-Timestamp':timestamp,'X-Audit-Signature':signature},body,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`Audit reporting failed: HTTP ${response.status}`);
 console.log('Audit event recorded');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
