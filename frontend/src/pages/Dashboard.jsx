import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const STATUS_COLORS = { todo: '#64748b', in_progress: '#6366f1', done: '#10b981' };
const PRIORITY_COLORS = { low: '#14b8a6', medium: '#f59e0b', high: '#ef4444' };

function StatCard({ value, label, icon, color, bg }) {
  return (
    <div className="stat-card" style={{'--stat-color': color, '--stat-bg': bg}}>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-icon">{icon}</div>
    </div>
  );
}

function isOverdue(task) {
  if (!task.due_date || task.status === 'done') return false;
  return new Date(task.due_date) < new Date();
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="app-layout">
      <div className="loading-page"><div className="spinner" style={{width:40,height:40,borderWidth:3}} /><p>Loading dashboard...</p></div>
    </div>
  );

  const statusData = data ? [
    { name: 'To Do', value: data.stats.todoCount, color: STATUS_COLORS.todo },
    { name: 'In Progress', value: data.stats.inProgressCount, color: STATUS_COLORS.in_progress },
    { name: 'Done', value: data.stats.doneCount, color: STATUS_COLORS.done },
  ] : [];

  const priorityData = data ? [
    { name: 'Low', value: data.tasksByPriority.low, fill: PRIORITY_COLORS.low },
    { name: 'Medium', value: data.tasksByPriority.medium, fill: PRIORITY_COLORS.medium },
    { name: 'High', value: data.tasksByPriority.high, fill: PRIORITY_COLORS.high },
  ] : [];

  return (
    <Layout title="Dashboard">
      {/* Stats */}
      <div className="stats-grid">
        <StatCard value={data?.stats.totalTasks ?? 0} label="Total Tasks" icon="📋" color="#6366f1" bg="rgba(99,102,241,0.15)" />
        <StatCard value={data?.stats.inProgressCount ?? 0} label="In Progress" icon="🔄" color="#6366f1" bg="rgba(99,102,241,0.12)" />
        <StatCard value={data?.stats.doneCount ?? 0} label="Completed" icon="✅" color="#10b981" bg="rgba(16,185,129,0.12)" />
        <StatCard value={data?.stats.overdueCount ?? 0} label="Overdue" icon="⚠️" color="#ef4444" bg="rgba(239,68,68,0.12)" />
        {isAdmin && <StatCard value={data?.stats.totalProjects ?? 0} label="Projects" icon="📁" color="#14b8a6" bg="rgba(20,184,166,0.12)" />}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Task Status Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{background:'#0f1120',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'#f1f5f9'}} />
              <Legend formatter={v => <span style={{color:'#94a3b8',fontSize:'0.8rem'}}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Tasks by Priority</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData} barSize={40}>
              <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:12}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:'#94a3b8',fontSize:12}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{background:'#0f1120',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'#f1f5f9'}} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent + Overdue */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Recent Activity</div>
          {data?.recentTasks?.length === 0 && <div className="empty-state"><p>No tasks yet</p></div>}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {data?.recentTasks?.map(task => (
              <div key={task.id} className="task-card" onClick={() => navigate('/tasks')} style={{cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                  <div className="task-card-title">{task.title}</div>
                  <span className={`badge badge-${task.status}`}>{task.status.replace('_',' ')}</span>
                </div>
                <div className="task-card-meta">
                  <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  {task.project && <span className="tag" style={{color: task.project.color}}>📁 {task.project.name}</span>}
                  {task.assignee && <span className="text-sm text-muted">👤 {task.assignee.name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title" style={{color:'var(--red)'}}>⚠️ Overdue Tasks</div>
          {data?.overdueTasks?.length === 0
            ? <div className="empty-state"><p style={{color:'var(--green)'}}>✅ No overdue tasks!</p></div>
            : <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {data?.overdueTasks?.map(task => (
                  <div key={task.id} className="task-card" style={{borderColor:'rgba(239,68,68,0.3)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div className="task-card-title">{task.title}</div>
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    </div>
                    <div className="task-card-meta">
                      {task.project && <span className="tag">📁 {task.project.name}</span>}
                      <span className="overdue-indicator">Due: {task.due_date}</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </Layout>
  );
}
