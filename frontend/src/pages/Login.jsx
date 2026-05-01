import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') setForm({ email: 'admin@demo.com', password: 'admin123' });
    else setForm({ email: 'jane@demo.com', password: 'member123' });
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow top" />
      <div className="auth-bg-glow bottom" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <span className="auth-logo-text">TaskFlow</span>
        </div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your workspace</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%',marginTop:4,justifyContent:'center'}}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div className="demo-creds">
          <div style={{marginBottom:8,fontWeight:600,color:'var(--text-primary)'}}>🚀 Demo Accounts</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button className="btn btn-secondary btn-sm" onClick={() => fillDemo('admin')}>Fill Admin</button>
            <button className="btn btn-secondary btn-sm" onClick={() => fillDemo('member')}>Fill Member</button>
          </div>
          <div style={{marginTop:8}}>Admin: <strong>admin@demo.com</strong> / admin123</div>
          <div>Member: <strong>jane@demo.com</strong> / member123</div>
        </div>

        <p className="auth-link">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
