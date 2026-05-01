import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

function TaskCard({ task, onEdit, onStatusChange, isAdmin }) {
  const priorityColor = { low:'#14b8a6', medium:'#f59e0b', high:'#ef4444' };
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

  return (
    <div className="task-card" onClick={() => onEdit(task)}>
      <div className="task-priority-bar" style={{background: priorityColor[task.priority]}} />
      <div style={{paddingLeft:8}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
          <div className="task-card-title">{task.title}</div>
          <span className={`badge badge-${task.status}`}>{task.status.replace('_',' ')}</span>
        </div>
        {task.description && <div style={{fontSize:'0.78rem',color:'var(--text-secondary)',marginTop:4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{task.description}</div>}
        <div className="task-card-meta">
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {task.project && <span className="tag" style={{color:task.project.color}}>📁 {task.project.name}</span>}
          {task.assignee && <span className="text-sm text-muted">👤 {task.assignee.name}</span>}
          {task.due_date && <span style={{fontSize:'0.72rem', color: isOverdue ? 'var(--red)' : 'var(--text-muted)'}}>
            {isOverdue ? '⚠️ ' : '📅 '}{task.due_date}
          </span>}
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { isAdmin, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [view, setView] = useState('kanban'); // 'kanban' | 'list'
  const [filters, setFilters] = useState({ status:'', priority:'', project_id:'' });
  const [form, setForm] = useState({ title:'', description:'', project_id:'', assigned_to:'', status:'todo', priority:'medium', due_date:'', tags:'' });

  const load = () => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.project_id) params.set('project_id', filters.project_id);
    api.get(`/tasks?${params}`).then(r => setTasks(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/projects').then(r => setProjects(r.data));
    if (isAdmin) api.get('/users/all').then(r => setUsers(r.data));
  }, [filters]);

  const openCreate = () => {
    setForm({ title:'', description:'', project_id: projects[0]?.id || '', assigned_to:'', status:'todo', priority:'medium', due_date:'', tags:'' });
    setEditTask(null);
    setShowModal(true);
  };

  const openEdit = task => {
    setForm({
      title: task.title, description: task.description || '',
      project_id: task.project_id, assigned_to: task.assigned_to || '',
      status: task.status, priority: task.priority,
      due_date: task.due_date || '', tags: task.tags || ''
    });
    setEditTask(task);
    setShowModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null };
      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, payload);
        toast.success('Task updated');
      } else {
        await api.post('/tasks', payload);
        toast.success('Task created');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Error');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this task?')) return;
    try { await api.delete(`/tasks/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const quickStatus = async (task, status) => {
    try { await api.put(`/tasks/${task.id}`, { ...task, status }); load(); }
    catch { toast.error('Failed'); }
  };

  // Group by status for kanban
  const columns = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  const colMeta = {
    todo: { label:'To Do', dot:'#64748b', next:'in_progress', nextLabel:'→ Start' },
    in_progress: { label:'In Progress', dot:'#6366f1', next:'done', nextLabel:'→ Done' },
    done: { label:'Done', dot:'#10b981', prev:'in_progress', prevLabel:'← Undo' },
  };

  return (
    <Layout
      title="Tasks"
      action={
        <div style={{display:'flex',gap:8}}>
          <div style={{display:'flex',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,padding:2}}>
            <button className={`btn btn-sm ${view==='kanban'?'btn-primary':'btn-secondary'}`} style={{borderRadius:6}} onClick={()=>setView('kanban')}>⬛ Board</button>
            <button className={`btn btn-sm ${view==='list'?'btn-primary':'btn-secondary'}`} style={{borderRadius:6}} onClick={()=>setView('list')}>☰ List</button>
          </div>
          {(isAdmin || true) && <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Task</button>}
        </div>
      }
    >
      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <select className="form-select" style={{width:'auto'}} value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}>
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select className="form-select" style={{width:'auto'}} value={filters.priority} onChange={e=>setFilters({...filters,priority:e.target.value})}>
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select className="form-select" style={{width:'auto'}} value={filters.project_id} onChange={e=>setFilters({...filters,project_id:e.target.value})}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(filters.status || filters.priority || filters.project_id) &&
          <button className="btn btn-secondary btn-sm" onClick={()=>setFilters({status:'',priority:'',project_id:''})}>✕ Clear</button>}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{width:40,height:40,borderWidth:3,margin:'0 auto'}} /></div>
      ) : view === 'kanban' ? (
        <div className="kanban-board">
          {Object.entries(columns).map(([status, taskList]) => (
            <div key={status} className="kanban-column">
              <div className="kanban-col-header">
                <div className="kanban-col-title">
                  <div style={{width:10,height:10,borderRadius:'50%',background:colMeta[status].dot}} />
                  {colMeta[status].label}
                </div>
                <span className="kanban-count">{taskList.length}</span>
              </div>
              <div className="kanban-tasks">
                {taskList.length === 0 && <div style={{textAlign:'center',padding:'30px 0',color:'var(--text-muted)',fontSize:'0.8rem'}}>Empty</div>}
                {taskList.map(task => (
                  <div key={task.id} className="task-card" onClick={() => openEdit(task)}>
                    <div className="task-priority-bar" style={{background:{ low:'#14b8a6',medium:'#f59e0b',high:'#ef4444' }[task.priority]}} />
                    <div style={{paddingLeft:8}}>
                      <div className="task-card-title" style={{marginBottom:6}}>{task.title}</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                        {task.project && <span className="tag" style={{fontSize:'0.65rem',color:task.project.color}}>📁 {task.project.name}</span>}
                        {task.due_date && (() => {
                          const od = task.status !== 'done' && new Date(task.due_date) < new Date();
                          return <span style={{fontSize:'0.65rem',color: od ? 'var(--red)':'var(--text-muted)'}}>{od?'⚠️':''} {task.due_date}</span>;
                        })()}
                      </div>
                      {task.assignee && <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:6}}>👤 {task.assignee.name}</div>}
                      <div style={{display:'flex',gap:6,marginTop:8}}>
                        {colMeta[status].next && (
                          <button className="btn btn-secondary btn-sm" style={{fontSize:'0.65rem',padding:'3px 8px'}}
                            onClick={e=>{e.stopPropagation();quickStatus(task, colMeta[status].next);}}>
                            {colMeta[status].nextLabel}
                          </button>
                        )}
                        {colMeta[status].prev && (
                          <button className="btn btn-secondary btn-sm" style={{fontSize:'0.65rem',padding:'3px 8px'}}
                            onClick={e=>{e.stopPropagation();quickStatus(task, colMeta[status].prev);}}>
                            {colMeta[status].prevLabel}
                          </button>
                        )}
                        {isAdmin && <button className="btn btn-danger btn-sm" style={{fontSize:'0.65rem',padding:'3px 8px'}} onClick={e=>{e.stopPropagation();handleDelete(task.id);}}>🗑️</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Task</th><th>Project</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due Date</th>{isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No tasks found</td></tr>}
              {tasks.map(task => {
                const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
                return (
                  <tr key={task.id} onClick={() => openEdit(task)} style={{cursor:'pointer'}}>
                    <td><div style={{fontWeight:600}}>{task.title}</div><div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{task.description?.slice(0,60)}</div></td>
                    <td>{task.project ? <span className="tag" style={{color:task.project.color}}>📁 {task.project.name}</span> : '—'}</td>
                    <td>{task.assignee ? <div style={{display:'flex',alignItems:'center',gap:6}}><div className="avatar" style={{width:24,height:24,fontSize:'0.65rem'}}>{task.assignee.name[0]}</div>{task.assignee.name}</div> : '—'}</td>
                    <td><span className={`badge badge-${task.status}`}>{task.status.replace('_',' ')}</span></td>
                    <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td><span style={{fontSize:'0.8rem',color:isOverdue?'var(--red)':'var(--text-secondary)'}}>{isOverdue?'⚠️ ':''}{task.due_date || '—'}</span></td>
                    {isAdmin && <td onClick={e=>e.stopPropagation()} style={{whiteSpace:'nowrap'}}>
                      <button className="btn btn-secondary btn-sm" style={{marginRight:6}} onClick={()=>openEdit(task)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(task.id)}>🗑️</button>
                    </td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <Modal title={editTask ? 'Edit Task' : 'Create Task'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div style={{display:'flex',flexDirection:'column',gap:14,padding:'0 24px 4px'}}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="Task title" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Details..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Project *</label>
                  <select className="form-select" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})} required>
                    <option value="">Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select className="form-select" value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})}>
                    <option value="">Unassigned</option>
                    {(isAdmin ? users : [user]).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tags</label>
                  <input className="form-input" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="design, backend..." />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{justifyContent:'space-between'}}>
              <div>
                {editTask && isAdmin && <button type="button" className="btn btn-danger btn-sm" onClick={() => { handleDelete(editTask.id); setShowModal(false); }}>Delete</button>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editTask ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
