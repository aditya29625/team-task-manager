const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false
});

// ── User Model ──────────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' },
  avatar: { type: DataTypes.STRING, defaultValue: null }
}, { tableName: 'users', timestamps: true });

// ── Project Model ────────────────────────────────────────────
const Project = sequelize.define('Project', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  status: { type: DataTypes.ENUM('active', 'completed', 'on_hold'), defaultValue: 'active' },
  deadline: { type: DataTypes.DATEONLY, allowNull: true },
  color: { type: DataTypes.STRING, defaultValue: '#6366f1' }
}, { tableName: 'projects', timestamps: true });

// ── ProjectMember join table ─────────────────────────────────
const ProjectMember = sequelize.define('ProjectMember', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  role: { type: DataTypes.ENUM('owner', 'admin', 'member'), defaultValue: 'member' }
}, { tableName: 'project_members', timestamps: true });

// ── Task Model ───────────────────────────────────────────────
const Task = sequelize.define('Task', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  status: { type: DataTypes.ENUM('todo', 'in_progress', 'done'), defaultValue: 'todo' },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  due_date: { type: DataTypes.DATEONLY, allowNull: true },
  tags: { type: DataTypes.STRING, defaultValue: '' }
}, { tableName: 'tasks', timestamps: true });

// ── Associations ─────────────────────────────────────────────
// Project owned by User
User.hasMany(Project, { foreignKey: 'owner_id', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// Project members (many-to-many)
Project.belongsToMany(User, { through: ProjectMember, foreignKey: 'project_id', as: 'members' });
User.belongsToMany(Project, { through: ProjectMember, foreignKey: 'user_id', as: 'memberProjects' });

// Tasks belong to project
Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Tasks assigned to user
User.hasMany(Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

// Tasks created by user
User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = { sequelize, User, Project, Task, ProjectMember };
