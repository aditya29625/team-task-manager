const express = require('express');
const { body, validationResult } = require('express-validator');
const { Project, User, Task, ProjectMember } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();
router.use(authenticate);

// GET /api/projects — list projects user is part of
router.get('/', async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await Project.findAll({
        include: [
          { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'members', attributes: ['id', 'name', 'email', 'role'], through: { attributes: ['role'] } },
          { model: Task, as: 'tasks', attributes: ['id', 'status'] }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else {
      projects = await Project.findAll({
        include: [
          { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'members', attributes: ['id', 'name', 'email', 'role'], through: { attributes: ['role'] } },
          { model: Task, as: 'tasks', attributes: ['id', 'status'] }
        ],
        where: {
          [Op.or]: [
            { owner_id: req.user.id },
            { '$members.id$': req.user.id }
          ]
        },
        order: [['createdAt', 'DESC']]
      });
    }
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects — create project (admin only)
router.post('/', requireAdmin, [
  body('name').trim().notEmpty().withMessage('Project name required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, deadline, color } = req.body;
    const project = await Project.create({
      name, description, deadline: deadline || null,
      color: color || '#6366f1',
      owner_id: req.user.id
    });

    // Add creator as owner member
    await ProjectMember.create({ project_id: project.id, user_id: req.user.id, role: 'owner' });

    const full = await Project.findByPk(project.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'members', attributes: ['id', 'name', 'email'], through: { attributes: ['role'] } }
      ]
    });
    res.status(201).json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'members', attributes: ['id', 'name', 'email', 'role'], through: { attributes: ['role'] } },
        {
          model: Task, as: 'tasks',
          include: [
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
            { model: User, as: 'creator', attributes: ['id', 'name'] }
          ]
        }
      ]
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id — update (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const { name, description, status, deadline, color } = req.body;
    await project.update({ name, description, status, deadline, color });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    await Task.destroy({ where: { project_id: project.id } });
    await ProjectMember.destroy({ where: { project_id: project.id } });
    await project.destroy();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/members — add member (admin)
router.post('/:id/members', requireAdmin, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { user_id, role } = req.body;
    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await ProjectMember.findOne({ where: { project_id: project.id, user_id } });
    if (existing) return res.status(409).json({ error: 'User already in project' });

    await ProjectMember.create({ project_id: project.id, user_id, role: role || 'member' });
    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId — remove member (admin)
router.delete('/:id/members/:userId', requireAdmin, async (req, res) => {
  try {
    await ProjectMember.destroy({
      where: { project_id: req.params.id, user_id: req.params.userId }
    });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
