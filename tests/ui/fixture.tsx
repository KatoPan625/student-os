import {createRoot} from 'react-dom/client';
import {StudentScreen} from '../../src/components/student/student-screen';
import {AssistantPanel} from '../../src/components/student/assistant-panel';
import type {StudentData,StudentView} from '../../src/lib/types';

const created_at='2026-10-22T03:00:00Z';
const user_id='fixture-owner';
const subjectA='11111111-1111-4111-8111-111111111111';
const subjectB='22222222-2222-4222-8222-222222222222';
const data:StudentData={
  subjects:[{id:subjectA,user_id,name:'Môn A',code:'A',color:'#059669',created_at},{id:subjectB,user_id,name:'Môn B',code:'B',color:'#ea580c',created_at}],
  tasks:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user_id,subject_id:subjectA,title:'Task A',description:'Ghi chú A',due_at:'2099-10-22T03:00:00Z',status:'todo',priority:'high',created_at},{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',user_id,subject_id:subjectB,title:'Task B',description:'Ghi chú B',due_at:'2099-10-23T03:00:00Z',status:'done',priority:'normal',created_at}],
  classSessions:[{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',user_id,subject_id:subjectA,starts_at:'2026-10-22T03:00:00Z',ends_at:'2026-10-22T04:00:00Z',location:'Phòng A',created_at}],
  focusSessions:[{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',user_id,subject_id:subjectA,started_at:new Date(Date.now()-3600000).toISOString(),minutes:25,created_at}],
};
const view=location.pathname.slice(1)||'dashboard';
if(!['dashboard','subjects','tasks','calendar'].includes(view))throw new Error('Unknown fixture view');
createRoot(document.getElementById('root')!).render(<><StudentScreen view={view as StudentView} data={data}/><AssistantPanel/></>);
