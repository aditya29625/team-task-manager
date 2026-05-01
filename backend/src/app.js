require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// In production, any request that doesn't match an API route should serve index.html
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Team Task Manager API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 5000;

// Sync DB and start server
sequelize.sync({ alter: true }).then(async () => {
  console.log('✅ Database synced');

  // Seed demo data if no users exist
  const { User } = require('./models');
  const count = await User.count();
  if (count === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    const memberHash = await bcrypt.hash('member123', 10);
    await User.bulkCreate([
      { name: 'Admin User', email: 'admin@demo.com', password: hash, role: 'admin' },
      { name: 'Jane Member', email: 'jane@demo.com', password: memberHash, role: 'member' },
      { name: 'Bob Member', email: 'bob@demo.com', password: memberHash, role: 'member' },
    ]);
    console.log('✅ Demo users seeded: admin@demo.com / admin123');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to sync database:', err);
});
