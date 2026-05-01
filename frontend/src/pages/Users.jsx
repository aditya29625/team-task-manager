import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Team Members">
      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{width:40,height:40,borderWidth:3,margin:'0 auto'}} /></div>
      ) : (
        <div>
          <div style={{marginBottom:20,color:'var(--text-secondary)',fontSize:'0.875rem'}}>{users.length} team members</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
            {users.map(u => {
              const initials = u.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
              return (
                <div key={u.id} className="card" style={{display:'flex',alignItems:'center',gap:14}}>
                  <div className="avatar" style={{width:48,height:48,fontSize:'1rem',flexShrink:0}}>{initials}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'0.95rem'}}>{u.name}</div>
                    <div style={{color:'var(--text-secondary)',fontSize:'0.78rem',marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                    <span className={`badge badge-${u.role}`}>{u.role}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Layout>
  );
}
