'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, GripVertical, X } from 'lucide-react';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TipTapEditor, TipTapViewer } from '@/components/ui/tiptap-editor';
import { Project } from '@/types';
import { useProjectsStore } from '@/store/projects';
import { cn } from '@/lib/utils';

interface ProjectSettingsModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

const PROJECT_ICONS = ['📋', '🎯', '🚀', '💡', '📊', '🔧', '📝', '🎨', '💼', '🏠', '🎮', '📚'];

export function ProjectSettingsModal({ project, isOpen, onClose }: ProjectSettingsModalProps) {
  const { updateProject, deleteProject, addSection } = useProjectsStore();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [color, setColor] = useState(project.color || '#6366f1');
  const [icon, setIcon] = useState(project.icon || '📋');
  const [newSectionName, setNewSectionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'sections'>('general');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setColor(project.color || '#6366f1');
      setIcon(project.icon || '📋');
    }
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProject(project._id, {
        name,
        description,
        color,
        icon,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await deleteProject(project._id);
        onClose();
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      await addSection(project._id, newSectionName);
      setNewSectionName('');
    } catch (error) {
      console.error('Failed to add section:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <span>Project Settings</span>
      </ModalHeader>
      
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'px-4 py-2 text-sm font-medium cursor-pointer transition-colors',
            activeTab === 'general'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={cn(
            'px-4 py-2 text-sm font-medium cursor-pointer transition-colors',
            activeTab === 'sections'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sections
        </button>
      </div>

      <ModalContent className="max-h-[60vh] overflow-y-auto">
        {activeTab === 'general' ? (
          <div className="space-y-6">
            {/* Project Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">Project Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            {/* Project Icon */}
            <div>
              <label className="text-sm font-medium mb-2 block">Icon</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_ICONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => setIcon(i)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl cursor-pointer transition-all',
                      icon === i
                        ? 'ring-2 ring-primary bg-primary/10'
                        : 'bg-muted hover:bg-accent'
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Color */}
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full cursor-pointer transition-all',
                      color === c && 'ring-2 ring-offset-2 ring-offset-background ring-white'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Project Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <TipTapEditor
                content={description}
                onChange={setDescription}
                placeholder="Add a description for this project..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add New Section */}
            <div className="flex gap-2">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="New section name"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
              />
              <Button onClick={handleAddSection} disabled={!newSectionName.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Sections List */}
            <div className="space-y-2">
              {project.sections.map((section, index) => (
                <motion.div
                  key={section._id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: section.color }}
                  />
                  <span className="flex-1 font-medium">{section.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Order: {section.order}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Project
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}

