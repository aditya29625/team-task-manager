const express = require('express');
const { body, validationResult } = require('express-validator');
const { Task, User, Project } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks — list tasks (admin: all, member: assigned to them)
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'admin') where.assigned_to = req.user.id;
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.project_id) where.project_id = req.query.project_id;

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name', 'color'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create task
router.post('/', [
  body('title').trim().notEmpty().withMessage('Task title required'),
  body('project_id').notEmpty().withMessage('Project ID required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, description, project_id, assigned_to, status, priority, due_date, tags } = req.body;

    const project = await Project.findByPk(project_id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const task = await Task.create({
      title, description, project_id,
      assigned_to: assigned_to || null,
      status: status || 'todo',
      priority: priority || 'medium',
      due_date: due_date || null,
      tags: tags || '',
      created_by: req.user.id
    });

    const full = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name', 'color'] }
      ]
    });
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name', 'color'] }
      ]
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id — update task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Members can only update status of their own tasks
    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this task' });
    }

    const { title, description, status, priority, due_date, assigned_to, tags } = req.body;
    const updateData = { status };

    // Admin can update all fields
    if (req.user.role === 'admin') {
      Object.assign(updateData, { title, description, priority, due_date, assigned_to, tags });
    }

    await task.update(updateData);

    const full = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name', 'color'] }
      ]
    });
    res.json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await task.destroy();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/tasks — tasks by project
router.get('/project/:projectId', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { project_id: req.params.projectId },
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      order: [['due_date', 'ASC']]
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
