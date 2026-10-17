import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { List, IListItem } from '../models';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const lists = await List.find({ user: req.user!._id }).sort({
      order: 1,
      createdAt: -1,
    });
    res.json({ success: true, data: lists });
  } catch (error) {
    console.error('Error fetching lists:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch lists' });
  }
});

router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await List.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });
    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch list' });
  }
});

router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, icon } = req.body;
    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'List name is required' });
    }
    const lastList = await List.findOne({ user: req.user!._id }).sort({
      order: -1,
    });
    const order = lastList ? lastList.order + 1 : 0;
    const list = await List.create({
      name: name.trim(),
      user: req.user!._id,
      color,
      icon,
      order,
      items: [],
    });
    res.status(201).json({ success: true, data: list });
  } catch (error) {
    console.error('Error creating list:', error);
    res.status(500).json({ success: false, message: 'Failed to create list' });
  }
});

router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, icon, order } = req.body;
    const list = await List.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(order !== undefined && { order }),
      },
      { new: true }
    );
    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error updating list:', error);
    res.status(500).json({ success: false, message: 'Failed to update list' });
  }
});

router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await List.findOneAndDelete({
      _id: req.params.id,
      user: req.user!._id,
    });
    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    res.json({ success: true, message: 'List deleted' });
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({ success: false, message: 'Failed to delete list' });
  }
});

router.post('/:id/items', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Item name is required' });
    }
    const list = await List.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });
    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    const maxOrder = list.items.reduce(
      (max, item) => Math.max(max, item.order),
      -1
    );
    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      name: name.trim(),
      description: description?.trim() ?? '',
      order: maxOrder + 1,
      createdAt: new Date(),
    };
    list.items.push(newItem);
    await list.save();
    res.status(201).json({ success: true, data: list });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ success: false, message: 'Failed to add item' });
  }
});

router.put(
  '/:id/items/:itemId',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, order } = req.body;
      const list = await List.findOne({
        _id: req.params.id,
        user: req.user!._id,
      });
      if (!list) {
        return res
          .status(404)
          .json({ success: false, message: 'List not found' });
      }
      const item = list.items.find(
        (i) => i._id.toString() === req.params.itemId
      );
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: 'Item not found' });
      }
      if (name !== undefined) item.name = name.trim();
      if (description !== undefined) item.description = description.trim();
      if (order !== undefined) item.order = order;
      await list.save();
      res.json({ success: true, data: list });
    } catch (error) {
      console.error('Error updating item:', error);
      res.status(500).json({ success: false, message: 'Failed to update item' });
    }
  }
);

router.delete(
  '/:id/items/:itemId',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const list = await List.findOne({
        _id: req.params.id,
        user: req.user!._id,
      });
      if (!list) {
        return res
          .status(404)
          .json({ success: false, message: 'List not found' });
      }
      const itemIndex = list.items.findIndex(
        (i) => i._id.toString() === req.params.itemId
      );
      if (itemIndex === -1) {
        return res
          .status(404)
          .json({ success: false, message: 'Item not found' });
      }
      list.items.splice(itemIndex, 1);
      await list.save();
      res.json({ success: true, data: list });
    } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
  }
);

router.post('/:id/items/reorder', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { orderedItemIds } = req.body as { orderedItemIds?: string[] };
    if (!Array.isArray(orderedItemIds)) {
      return res
        .status(400)
        .json({ success: false, message: 'orderedItemIds array is required' });
    }
    const list = await List.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });
    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }
    const idToItem = new Map(list.items.map((i) => [i._id.toString(), i]));
    const seen = new Set<string>();
    const reordered: IListItem[] = [];
    for (const id of orderedItemIds) {
      const item = idToItem.get(id);
      if (item && !seen.has(id)) {
        seen.add(id);
        reordered.push(item);
      }
    }
    const rest = list.items.filter((i) => !seen.has(i._id.toString()));
    list.items = reordered.concat(rest);
    list.items.forEach((item, index) => {
      item.order = index;
    });
    await list.save();
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error reordering items:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder items' });
  }
});

router.post(
  '/:id/items/:itemId/move',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const { targetListId } = req.body;
      if (!targetListId) {
        return res
          .status(400)
          .json({ success: false, message: 'Target list ID is required' });
      }
      const sourceList = await List.findOne({
        _id: req.params.id,
        user: req.user!._id,
      });
      if (!sourceList) {
        return res
          .status(404)
          .json({ success: false, message: 'Source list not found' });
      }
      const targetList = await List.findOne({
        _id: targetListId,
        user: req.user!._id,
      });
      if (!targetList) {
        return res
          .status(404)
          .json({ success: false, message: 'Target list not found' });
      }
      const itemIndex = sourceList.items.findIndex(
        (i) => i._id.toString() === req.params.itemId
      );
      if (itemIndex === -1) {
        return res
          .status(404)
          .json({ success: false, message: 'Item not found' });
      }
      const [item] = sourceList.items.splice(itemIndex, 1);
      const maxOrder = targetList.items.reduce(
        (max, i) => Math.max(max, i.order),
        -1
      );
      item.order = maxOrder + 1;
      targetList.items.push(item);
      await Promise.all([sourceList.save(), targetList.save()]);
      res.json({
        success: true,
        data: { sourceList, targetList, movedItem: item },
      });
    } catch (error) {
      console.error('Error moving item:', error);
      res.status(500).json({ success: false, message: 'Failed to move item' });
    }
  }
);

export default router;
