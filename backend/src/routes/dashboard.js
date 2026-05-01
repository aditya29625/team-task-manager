const express = require('express');
const { Task, Project, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op, fn, col, literal } = require('sequelize');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const where = req.user.role !== 'admin' ? { assigned_to: req.user.id } : {};
    const now = new Date().toISOString().split('T')[0];

    const [
      totalTasks,
      todoCount,
      inProgressCount,
      doneCount,
      overdueCount,
      totalProjects
    ] = await Promise.all([
      Task.count({ where }),
      Task.count({ where: { ...where, status: 'todo' } }),
      Task.count({ where: { ...where, status: 'in_progress' } }),
      Task.count({ where: { ...where, status: 'done' } }),
      Task.count({ where: { ...where, due_date: { [Op.lt]: now }, status: { [Op.ne]: 'done' } } }),
      Project.count()
    ]);

    // Recent tasks (last 5)
    const recentTasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name', 'color'] }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 5
    });

    // Overdue tasks list
    const overdueTasks = await Task.findAll({
      where: { ...where, due_date: { [Op.lt]: now }, status: { [Op.ne]: 'done' } },
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name', 'color'] }
      ],
      order: [['due_date', 'ASC']],
      limit: 10
    });

    // Tasks by priority
    const tasksByPriority = {
      low: await Task.count({ where: { ...where, priority: 'low' } }),
      medium: await Task.count({ where: { ...where, priority: 'medium' } }),
      high: await Task.count({ where: { ...where, priority: 'high' } })
    };

    // Projects with task counts (admin only)
    let projectStats = [];
    if (req.user.role === 'admin') {
      const projects = await Project.findAll({
        include: [{ model: Task, as: 'tasks', attributes: ['id', 'status'] }],
        limit: 6
      });
      projectStats = projects.map(p => ({
        name: p.name,
        color: p.color,
        total: p.tasks.length,
        done: p.tasks.filter(t => t.status === 'done').length,
        in_progress: p.tasks.filter(t => t.status === 'in_progress').length,
        todo: p.tasks.filter(t => t.status === 'todo').length
      }));
    }

    res.json({
      stats: { totalTasks, todoCount, inProgressCount, doneCount, overdueCount, totalProjects },
      recentTasks,
      overdueTasks,
      tasksByPriority,
      projectStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
