import pytest
from wcp_data.models.schemas import DecisionCreate

pytestmark=[pytest.mark.integration,pytest.mark.asyncio]

def pending(job):
 return DecisionCreate(job_id=job,verdict='needs_review',trust_score=.5,trust_band='require_human_review',requires_human_review=True,warning_count=1)

async def test_nonterminal_review_is_rejected_without_losing_future_resolution(client):
 row=(await client.post('/internal/decisions',json=pending('review-defer').model_dump())).json()
 deferred=await client.post(f"/internal/decisions/{row['id']}/override",json={'verdict':'needs_review','reviewer':'verified-auditor','note':'Need documents'})
 assert deferred.status_code==422
 unchanged=(await client.get(f"/internal/decisions/{row['id']}")).json()
 assert unchanged['requires_human_review'] is True
 final=await client.post(f"/internal/decisions/{row['id']}/override",json={'verdict':'approved','reviewer':'verified-auditor','note':'Reviewed documents'})
 assert final.status_code==200
 events=(await client.get('/internal/audit-events',params={'job_id':'review-defer'})).json()
 reviews=[e for e in events if e['event_type']=='human_review_complete']
 assert len(reviews)==1 and reviews[0]['actor']=='verified-auditor'

async def test_legacy_warning_abstention_remains_visible_and_actionable_without_rewriting_history(client):
 old=pending('legacy-abstention').model_copy(update={'requires_human_review':False,'trust_band':'flag_for_review','trust_score':.8375})
 row=(await client.post('/internal/decisions',json=old.model_dump())).json()
 approved=old.model_copy(update={'job_id':'approved-without-review','verdict':'approved'})
 approved_row=(await client.post('/internal/decisions',json=approved.model_dump())).json()
 complete=(await client.post('/internal/decisions',json=pending('actually-completed').model_dump())).json()
 await client.post(f"/internal/decisions/{complete['id']}/override",json={'verdict':'approved','reviewer':'verified-other'})
 queue=await client.get('/internal/decisions',params={'trust_band':'require_human_review','requires_human_review':'true'})
 # Shared-database safe membership: the legacy row stays queued while the
 # finalized rows are excluded.
 queue_ids={d['id']for d in queue.json()}
 assert row['id']in queue_ids
 assert approved_row['id']not in queue_ids and complete['id']not in queue_ids
 prior=(await client.get(f"/internal/decisions/{row['id']}")).json()
 assert prior['requires_human_review'] is False and prior['trust_band']=='flag_for_review'
 final=await client.post(f"/internal/decisions/{row['id']}/override",json={'verdict':'approved','reviewer':'verified-auditor'})
 assert final.status_code==200
 repeated=await client.post(f"/internal/decisions/{row['id']}/override",json={'verdict':'approved','reviewer':'verified-auditor'})
 assert repeated.status_code==200
 resolved_ids={d['id']for d in (await client.get('/internal/decisions',params={'trust_band':'require_human_review','requires_human_review':'true'})).json()}
 assert row['id']not in resolved_ids
 events=(await client.get('/internal/audit-events',params={'job_id':'legacy-abstention'})).json()
 reviews=[e for e in events if e['event_type']=='human_review_complete']
 assert len(reviews)==1 and reviews[0]['actor']=='verified-auditor'
 assert any(e['event_type']=='decision_persisted' for e in events)
