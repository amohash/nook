import {existsSync, writeFileSync} from 'node:fs';
import {DiscoveryResponseSchema, QuerySchema, RecommendationSchema, SpotDetailSchema} from '@space/contracts';
import {rankSpots} from '@space/core';
import {createDemoQuery} from '@space/fixtures';
// Operator-only, up to 48 planned provider attempts across four named public origins.
// Never reads device GPS. Uses the running API's existing persistent account budget.
async function main() {
const args=process.argv.slice(2);
if(!args.includes('--authorize-spend') || args.some(a=>a!=='--authorize-spend' && !a.startsWith('--api-base=') && !a.startsWith('--output='))) throw new Error('Expected --authorize-spend --api-base=https://... --output=new-report.json');
const apiBase=args.find(a=>a.startsWith('--api-base='))?.slice(11);
const output=args.find(a=>a.startsWith('--output='))?.slice(9);
if(!apiBase || !output || existsSync(output)) throw new Error('API base and a new output path are required');
const parsed=new URL(apiBase);
if(parsed.protocol!=='https:' || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Expected public HTTPS API origin');
const base=apiBase.replace(/\/$/,'');
let token='';
const request=async(path:string,body?:unknown)=>{
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)});
 if(!response.ok) throw new Error(`HTTP ${response.status} at ${path.split('/').slice(0,3).join('/')}`);
 return response.json();
};
const access=await request('/v1/guest-sessions',{}); token=access.sessionId;
if(!token) throw new Error('No guest session');
const records=[];
for(const area of [{name:'north Austin',lat:30.4021,lng:-97.7253},{name:'south Austin',lat:30.165,lng:-97.823},{name:'east Austin',lat:30.285,lng:-97.65},{name:'west Austin',lat:30.34,lng:-97.86}]) {
 const origin={lat:area.lat,lng:area.lng,source:'manual' as const};
 const result=DiscoveryResponseSchema.parse(await request('/v1/discovery',{sessionId:token,origin}));
 if(!result.snapshot || !result.snapshotId || !['ready','partial'].includes(result.status)) throw new Error(`Discovery ${result.status} for ${area.name}: ${result.warnings.join(';')}`);
 const warm=DiscoveryResponseSchema.parse(await request('/v1/discovery',{sessionId:token,origin}));
 if(warm.snapshotId!==result.snapshotId || warm.metrics.externalAttempts!==0) throw new Error('Warm cache mismatch');
 const query=QuerySchema.parse({...createDemoQuery(),categories:['cafe','library'],cityId:'us-tx-austin',origin,snapshotId:result.snapshotId,departAt:new Date().toISOString(),maxWalkMinutes:60});
 const ranking=RecommendationSchema.parse(await request('/v1/recommendations',query));
 const expected=rankSpots(result.snapshot.spots,query,{now:ranking.generatedAt});
 if(JSON.stringify(ranking.results.map(({spot:_spot,...r})=>r))!==JSON.stringify(expected.results) || ranking.metrics.externalCalls!==0) throw new Error('Ranking parity failed');
 for(const r of ranking.results) {
  const detail=SpotDetailSchema.parse(await request(`/v1/discovery/${result.snapshotId}/places/${encodeURIComponent(r.spotId)}`));
  if(JSON.stringify(detail.spot)!==JSON.stringify(r.spot)) throw new Error('Detail identity mismatch');
 }
 const record={area:area.name,origin,categories:query.categories,policy:result.coverage?.policy,status:result.status,candidates:result.snapshot.spots.length,metrics:result.metrics,warmAttempts:warm.metrics.externalAttempts,qualifying:ranking.metrics.qualifyingCount,top:ranking.results.map(r=>({name:r.spot.name,walk:r.estimatedWalkMinutes,score:r.score})),scorerParity:true,detailParity:true};
 records.push(record); console.log(JSON.stringify(record));
}
writeFileSync(output,JSON.stringify({measuredAt:new Date().toISOString(),scope:'Actual public HTTPS API tunnel to local development server; named public test origins, not device GPS',phoneVerified:false,guestAccess:true,records},null,2)+'\n',{flag:'wx'});
}
main().catch(()=>{console.error('Austin verification failed; inspect configuration, API availability, quota and any preceding area records.');process.exitCode=1;});
