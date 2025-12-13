'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, GripVertical, Users } from 'lucide-react';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TipTapEditor, TipTapViewer } from '@/components/ui/tiptap-editor';
import { Project } from '@/types';
import { useProjectsStore } from '@/store/projects';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
  const { updateProject, deleteProject, addSection, inviteToProject, fetchProject, currentProject } = useProjectsStore();
  const { user } = useAuthStore();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [color, setColor] = useState(project.color || '#6366f1');
  const [icon, setIcon] = useState(project.icon || '📋');
  const [newSectionName, setNewSectionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'sections' | 'members'>('general');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const liveProject = currentProject?._id === project._id ? currentProject : project;
  const ownerId = (liveProject.owner as any)?.id || (liveProject.owner as any)?._id;
  const isOwner = !!user?.id && String(user.id) === String(ownerId);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setColor(project.color || '#6366f1');
      setIcon(project.icon || '📋');
    }
  }, [project]);

  useEffect(() => {
    if (isOpen) {
      setInviteEmail('');
      setIsInviting(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProject(project._id, {
        name,
        description,
        color,
        icon,
      });
      toast.success('Project updated');
      onClose();
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) {
      toast.error('Only the project owner can delete this project');
      return;
    }
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await deleteProject(project._id);
        toast.success('Project deleted');
        onClose();
      } catch (error) {
        console.error('Failed to delete project:', error);
        toast.error('Failed to delete project');
      }
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      await addSection(project._id, newSectionName);
      await fetchProject(project._id);
      setNewSectionName('');
      toast.success('Section added');
    } catch (error) {
      console.error('Failed to add section:', error);
      const message =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        'Failed to add section';
      toast.error(message);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setIsInviting(true);
    try {
      await inviteToProject(project._id, email);
      toast.success('User invited to project');
      setInviteEmail('');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to invite user';
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const getInitials = (fullName: string) =>
    fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

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
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            'px-4 py-2 text-sm font-medium cursor-pointer transition-colors flex items-center gap-2',
            activeTab === 'members'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="h-4 w-4" />
          Members
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
        ) : activeTab === 'sections' ? (
          <div className="space-y-4">
            {/* Add New Section */}
            <div className="flex gap-2">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="New section name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSection();
                  }
                }}
              />
              <Button onClick={handleAddSection} disabled={!newSectionName.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Sections List */}
            <div className="space-y-2">
              {liveProject.sections.map((section, index) => (
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
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Invite by email</label>
              <div className="flex gap-2">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                />
                <Button
                  type="button"
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || isInviting}
                >
                  Invite
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The invited user must already be registered.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">People</p>

              {/* Owner */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(liveProject.owner?.name || 'Owner')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {liveProject.owner?.name || 'Owner'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {liveProject.owner?.email || ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">Owner</span>
              </div>

              {/* Members */}
              {(liveProject.members || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {(liveProject.members || []).map((member) => (
                    <div
                      key={(member as any).id || (member as any)._id || member.email}
                      className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Member</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <Button variant="destructive" onClick={handleDelete} disabled={!isOwner}>
            <Trash2 className="w-4 h-4 mr-2" />
            {isOwner ? 'Delete Project' : 'Only owner can delete'}
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

