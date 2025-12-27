import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes';
import commentRoutes from './comment.routes';
import notificationRoutes from './notification.routes';
import userRoutes from './user.routes';
import chatRoutes from './chat.routes';
import calendarRoutes from './calendar.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/comments', commentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);
router.use('/chats', chatRoutes);
router.use('/calendar', calendarRoutes);

export default router;
