import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ title, children, action }) {
  const { user, isAdmin } = useAuth();
  return (
    <div className="main-content">
      <header className="topbar">
        <div className="topbar-title">{title}</div>
        <div className="topbar-actions">
          {action}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
            <span style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{user?.name}</span>
          </div>
        </div>
      </header>
      <div className="page">{children}</div>
    </div>
  );
}
