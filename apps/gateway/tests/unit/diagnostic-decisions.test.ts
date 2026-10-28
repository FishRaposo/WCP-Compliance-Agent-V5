import {describe,it,expect,vi,beforeEach} from 'vitest';
import {Hono} from 'hono';
const client=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../../src/clients/data-platform-client.js',()=>({dataPlatformClient:client}));
import {decisionsRoutes} from '../../src/routes/decisions.js';
import {authMiddleware} from '../../src/middleware/auth.js';
import {signToken} from '../../src/auth/jwt.js';
beforeEach(()=>vi.clearAllMocks());
describe('decision UI and verified review identity contracts',()=>{
 async function app(){const a=new Hono();a.use('*',authMiddleware);a.route('/',decisionsRoutes);return{a,token:await signToken('real-user-id','real-auditor@example.invalid','analyst')}}
 it('adds decision_id for selecting the actual persisted decision',async()=>{
  client.get.mockResolvedValue([{id:'durable-decision',job_id:'job',requires_human_review:true}]);
  const{a,token}=await app();const r=await a.request('/api/v1/decisions',{headers:{Authorization:'Bearer '+token}});
  expect((await r.json())[0]).toMatchObject({id:'durable-decision',decision_id:'durable-decision'});
 });
 it('forwards the pending-review filter',async()=>{
  client.get.mockResolvedValue([]);const{a,token}=await app();
  await a.request('/api/v1/decisions?trust_band=require_human_review&requires_human_review=true',{headers:{Authorization:'Bearer '+token}});
  expect(client.get.mock.calls[0][0]).toContain('requires_human_review=true');
 });
 it('records JWT identity rather than a forged body reviewer',async()=>{
  client.post.mockResolvedValue({id:'durable-decision'});const{a,token}=await app();
  const r=await a.request('/api/v1/decisions/durable-decision/review',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({reviewer:'forged-admin@example.invalid',verdict:'approved'})});
  expect(r.status).toBe(200);expect(client.post.mock.calls[0][1].reviewer).toBe('real-user-id');
 });
});
