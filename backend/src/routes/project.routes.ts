import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Project, Task, User } from '../models';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/projects
// @desc    Get all projects for current user
// @access  Private
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user?._id }, { members: req.user?._id }],
      isArchived: false,
    })
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
    });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color, icon, sections } = req.body;

    const project = new Project({
      name,
      description,
      color,
      icon,
      sections: sections || [
        { name: 'To Do', order: 0, color: '#6366f1' },
        { name: 'In Progress', order: 1, color: '#f59e0b' },
        { name: 'Done', order: 2, color: '#22c55e' },
      ],
      owner: req.user?._id,
    });
    await project.save();

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating project',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get a single project with tasks
// @access  Private
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user?._id }, { members: req.user?._id }],
    })
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    // Get tasks for this project
    const tasks = await Task.find({ project: project._id })
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...project.toObject(),
        tasks,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error fetching project',
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color, icon, sections } = req.body;

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user?._id,
      },
      { name, description, color, icon, sections },
      { new: true, runValidators: true }
    );

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found or not authorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error updating project',
    });
  }
});

// @route   PUT /api/projects/:id/sections
// @desc    Update project sections
// @access  Private
router.put('/:id/sections', async (req: AuthRequest, res: Response) => {
  try {
    const { sections } = req.body;

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ owner: req.user?._id }, { members: req.user?._id }],
      },
      { sections },
      { new: true, runValidators: true }
    );

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    res.status(200).json({
      success: true,
      data: populated,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error updating sections',
    });
  }
});

// @route   POST /api/projects/:id/invite
// @desc    Invite (add) a member to the project by email
// @access  Private (owner only)
router.post('/:id/invite', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user?._id,
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found or not authorized',
      });
      return;
    }

    const userToInvite = await User.findOne({ email: normalizedEmail });
    if (!userToInvite) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (String(userToInvite._id) === String(project.owner)) {
      res.status(400).json({
        success: false,
        message: 'Owner is already part of the project',
      });
      return;
    }

    const alreadyMember = project.members.some(
      m => String(m) === String(userToInvite._id)
    );

    if (alreadyMember) {
      res.status(409).json({
        success: false,
        message: 'User is already a member of this project',
      });
      return;
    }

    project.members.push(userToInvite._id);
    await project.save();

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'User added to project',
      data: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error inviting user to project',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   POST /api/projects/:id/sections
// @desc    Add a new section to project
// @access  Private
router.post('/:id/sections', async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;

    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user?._id }, { members: req.user?._id }],
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    const maxOrder = Math.max(...project.sections.map(s => s.order), -1);

    project.sections.push({
      _id: new mongoose.Types.ObjectId(),
      name,
      order: maxOrder + 1,
      color: color || '#6366f1',
    });

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error adding section',
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.user?._id,
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found or not authorized',
      });
      return;
    }

    // Delete all tasks in this project
    await Task.deleteMany({ project: project._id });

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Error deleting project',
    });
  }
});

export default router;
