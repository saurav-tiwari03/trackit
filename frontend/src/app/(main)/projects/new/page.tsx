'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectsStore } from '@/store/projects';
import { cn } from '@/lib/utils';

const colors = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
];

const icons = ['📋', '🎯', '💼', '🚀', '💡', '📱', '🎨', '📊', '🔧', '📝'];

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject } = useProjectsStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [icon, setIcon] = useState(icons[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const project = await createProject({
        name,
        description,
        color,
      });
      router.push(`/projects/${project._id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Create Project</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Project Preview */}
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: color + '20' }}
                  >
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {name || 'Project Name'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {description || 'Project description'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Project Name
                  </label>
                  <Input
                    placeholder="My Awesome Project"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Description
                  </label>
                  <textarea
                    placeholder="What is this project about?"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border transition-colors resize-none',
                      'bg-background border-input text-foreground',
                      'placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-ring'
                    )}
                  />
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          'w-8 h-8 rounded-full transition-transform cursor-pointer',
                          color === c && 'ring-2 ring-offset-2 ring-ring scale-110'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {icons.map(i => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIcon(i)}
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center text-lg cursor-pointer',
                          'bg-muted transition-transform',
                          icon === i && 'ring-2 ring-ring scale-110'
                        )}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
