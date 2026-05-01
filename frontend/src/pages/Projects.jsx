import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1','#14b8a6','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6'];

function ProjectCard({ project, onEdit, onDelete, onManage, isAdmin }) {
  const total = project.tasks?.length ?? 0;
  const done = project.tasks?.filter(t => t.status === 'done').length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="card" style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:12,height:12,borderRadius:'50%',background:project.color,flexShrink:0,boxShadow:`0 0 8px ${project.color}`}} />
          <div>
            <div style={{fontWeight:700,fontSize:'1rem'}}>{project.name}</div>
            <div style={{color:'var(--text-secondary)',fontSize:'0.78rem',marginTop:2}}>{project.description || 'No description'}</div>
          </div>
        </div>
        <span className={`badge badge-${project.status}`}>{project.status.replace('_',' ')}</span>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>Progress</span>
          <span style={{fontSize:'0.75rem',fontWeight:600,color:project.color}}>{pct}%</span>
        </div>
        <div style={{background:'var(--border)',borderRadius:99,height:6}}>
          <div style={{background:project.color,width:`${pct}%`,height:'100%',borderRadius:99,transition:'width 0.5s ease',boxShadow:`0 0 8px ${project.color}`}} />
        </div>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:12}}>
          <span style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>{total} tasks · {done} done</span>
          {project.deadline && <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>📅 {project.deadline}</span>}
        </div>
        <div style={{display:'flex',gap:6}}>
          {isAdmin && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => onManage(project)}>👥 Team</button>
              <button className="btn btn-secondary btn-sm" onClick={() => onEdit(project)}>✏️</button>
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(project.id)}>🗑️</button>
            </>
          )}
        </div>
      </div>

      {/* Members avatars */}
      {project.members?.length > 0 && (
        <div style={{display:'flex',gap:-4}}>
          {project.members.slice(0,5).map((m,i) => (
            <div key={m.id} className="avatar" style={{width:26,height:26,fontSize:'0.6rem',marginLeft: i > 0 ? -6 : 0,border:'2px solid var(--bg-secondary)',zIndex:5-i}} title={m.name}>
              {m.name[0].toUpperCase()}
            </div>
          ))}
          {project.members.length > 5 && <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginLeft:6,alignSelf:'center'}}>+{project.members.length - 5}</div>}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [manageProject, setManageProject] = useState(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [form, setForm] = useState({ name:'', description:'', deadline:'', color:'#6366f1', status:'active' });

  const load = () => api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); api.get('/users/all').then(r => setUsers(r.data)); }, []);

  const openEdit = (p) => {
    setForm({ name: p.name, description: p.description || '', deadline: p.deadline || '', color: p.color || '#6366f1', status: p.status });
    setEditProject(p);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editProject) {
        await api.put(`/projects/${editProject.id}`, form);
        toast.success('Project updated');
        setEditProject(null);
      } else {
        await api.post('/projects', form);
        toast.success('Project created');
        setShowCreate(false);
      }
      setForm({ name:'', description:'', deadline:'', color:'#6366f1', status:'active' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving project');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try { await api.delete(`/projects/${id}`); toast.success('Deleted'); load(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const handleAddMember = async () => {
    if (!addMemberUserId) return;
    try {
      await api.post(`/projects/${manageProject.id}/members`, { user_id: addMemberUserId });
      toast.success('Member added');
      setAddMemberUserId('');
      load();
      const updated = await api.get('/projects');
      const found = updated.data.find(p => p.id === manageProject.id);
      if (found) setManageProject(found);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleRemoveMember = async userId => {
    try {
      await api.delete(`/projects/${manageProject.id}/members/${userId}`);
      toast.success('Member removed');
      load();
      const updated = await api.get('/projects');
      const found = updated.data.find(p => p.id === manageProject.id);
      if (found) setManageProject(found);
    } catch (err) { toast.error('Failed'); }
  };

  const ProjectForm = ({ onClose }) => (
    <form onSubmit={handleSubmit}>
      <div className="modal-body" style={{gap:14}}>
        <div className="form-group">
          <label className="form-label">Project Name *</label>
          <input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="e.g. Website Redesign" />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Brief project description..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Deadline</label>
            <input className="form-input" type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm({...form,color:c})} style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',border: form.color===c ? '3px solid #fff' : '3px solid transparent',transition:'border 0.15s'}} />
              ))}
            </div>
          </div>
        </div>
        {editProject && (
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" type="submit">{editProject ? 'Update' : 'Create'} Project</button>
      </div>
    </form>
  );

  return (
    <Layout title="Projects" action={isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ New Project</button>}>
      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{width:40,height:40,borderWidth:3,margin:'0 auto'}} /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📁</div>
          <p>No projects yet{isAdmin ? ' — create one!' : '. Ask an admin to add you.'}</p>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:18}}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} isAdmin={isAdmin}
              onEdit={openEdit} onDelete={handleDelete} onManage={setManageProject} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create New Project" onClose={() => setShowCreate(false)}>
          <ProjectForm onClose={() => setShowCreate(false)} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editProject && (
        <Modal title="Edit Project" onClose={() => setEditProject(null)}>
          <ProjectForm onClose={() => setEditProject(null)} />
        </Modal>
      )}

      {/* Manage Team Modal */}
      {manageProject && (
        <Modal title={`Team — ${manageProject.name}`} onClose={() => setManageProject(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <div className="form-label" style={{marginBottom:8}}>Current Members</div>
              {manageProject.members?.length === 0 && <p className="text-muted text-sm">No members yet</p>}
              {manageProject.members?.map(m => (
                <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div className="avatar" style={{width:28,height:28,fontSize:'0.7rem'}}>{m.name[0]}</div>
                    <div>
                      <div style={{fontWeight:600,fontSize:'0.85rem'}}>{m.name}</div>
                      <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{m.email}</div>
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>
                </div>
              ))}
            </div>
            <div>
              <div className="form-label" style={{marginBottom:8}}>Add Member</div>
              <div style={{display:'flex',gap:8}}>
                <select className="form-select" value={addMemberUserId} onChange={e => setAddMemberUserId(e.target.value)}>
                  <option value="">Select user...</option>
                  {users.filter(u => !manageProject.members?.find(m => m.id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" onClick={handleAddMember}>Add</button>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setManageProject(null)}>Close</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
