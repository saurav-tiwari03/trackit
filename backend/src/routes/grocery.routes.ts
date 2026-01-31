import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { GroceryList } from '../models';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all grocery lists for the user
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const lists = await GroceryList.find({ user: req.user!._id })
      .sort({ order: 1, createdAt: -1 });
    
    res.json({ success: true, data: lists });
  } catch (error) {
    console.error('Error fetching grocery lists:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch grocery lists' });
  }
});

// Get a single grocery list
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await GroceryList.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching grocery list:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch grocery list' });
  }
});

// Create a new grocery list
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, icon } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'List name is required' });
    }

    // Get the highest order number
    const lastList = await GroceryList.findOne({ user: req.user!._id })
      .sort({ order: -1 });
    const order = lastList ? lastList.order + 1 : 0;

    const list = await GroceryList.create({
      name: name.trim(),
      user: req.user!._id,
      color,
      icon,
      order,
      items: [],
    });

    res.status(201).json({ success: true, data: list });
  } catch (error) {
    console.error('Error creating grocery list:', error);
    res.status(500).json({ success: false, message: 'Failed to create grocery list' });
  }
});

// Update a grocery list
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, icon, order } = req.body;

    const list = await GroceryList.findOneAndUpdate(
      { _id: req.params.id, user: req.user!._id },
      { 
        ...(name && { name: name.trim() }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(order !== undefined && { order }),
      },
      { new: true }
    );

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error updating grocery list:', error);
    res.status(500).json({ success: false, message: 'Failed to update grocery list' });
  }
});

// Delete a grocery list
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await GroceryList.findOneAndDelete({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    res.json({ success: true, message: 'List deleted' });
  } catch (error) {
    console.error('Error deleting grocery list:', error);
    res.status(500).json({ success: false, message: 'Failed to delete grocery list' });
  }
});

// Add an item to a list
router.post('/:id/items', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, quantity, unit } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Item name is required' });
    }

    const list = await GroceryList.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    // Get the highest order number for items
    const maxOrder = list.items.reduce((max, item) => Math.max(max, item.order), -1);

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      name: name.trim(),
      quantity: quantity || 1,
      unit: unit?.trim(),
      isCompleted: false,
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

// Update an item in a list
router.put('/:id/items/:itemId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, quantity, unit, isCompleted, order } = req.body;

    const list = await GroceryList.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    const item = list.items.find((i) => i._id.toString() === req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (name !== undefined) item.name = name.trim();
    if (quantity !== undefined) item.quantity = quantity;
    if (unit !== undefined) item.unit = unit?.trim();
    if (isCompleted !== undefined) item.isCompleted = isCompleted;
    if (order !== undefined) item.order = order;

    await list.save();

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ success: false, message: 'Failed to update item' });
  }
});

// Delete an item from a list
router.delete('/:id/items/:itemId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await GroceryList.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    const itemIndex = list.items.findIndex((i) => i._id.toString() === req.params.itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    list.items.splice(itemIndex, 1);
    await list.save();

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ success: false, message: 'Failed to delete item' });
  }
});

// Move an item from one list to another
router.post('/:id/items/:itemId/move', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { targetListId } = req.body;

    if (!targetListId) {
      return res.status(400).json({ success: false, message: 'Target list ID is required' });
    }

    // Get source list
    const sourceList = await GroceryList.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!sourceList) {
      return res.status(404).json({ success: false, message: 'Source list not found' });
    }

    // Get target list
    const targetList = await GroceryList.findOne({
      _id: targetListId,
      user: req.user!._id,
    });

    if (!targetList) {
      return res.status(404).json({ success: false, message: 'Target list not found' });
    }

    // Find the item in source list
    const itemIndex = sourceList.items.findIndex((i) => i._id.toString() === req.params.itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Remove item from source list
    const [item] = sourceList.items.splice(itemIndex, 1);

    // Get the highest order number in target list
    const maxOrder = targetList.items.reduce((max, i) => Math.max(max, i.order), -1);
    item.order = maxOrder + 1;

    // Add item to target list
    targetList.items.push(item);

    // Save both lists
    await Promise.all([sourceList.save(), targetList.save()]);

    res.json({ 
      success: true, 
      data: { 
        sourceList, 
        targetList,
        movedItem: item,
      } 
    });
  } catch (error) {
    console.error('Error moving item:', error);
    res.status(500).json({ success: false, message: 'Failed to move item' });
  }
});

// Clear completed items from a list
router.post('/:id/clear-completed', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await GroceryList.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'List not found' });
    }

    list.items = list.items.filter((item) => !item.isCompleted);
    await list.save();

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error clearing completed items:', error);
    res.status(500).json({ success: false, message: 'Failed to clear completed items' });
  }
});

export default router;
