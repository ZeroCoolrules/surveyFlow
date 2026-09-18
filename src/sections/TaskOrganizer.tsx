import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  MoreHorizontal, 
  Plus, 
  Clock, 
  DollarSign, 
  GripVertical,
  CheckCircle2,
  Circle,
  ArrowRight,
  Calendar,
  Trash2,
  Edit2
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Task } from '@/types';

gsap.registerPlugin(ScrollTrigger);

type TaskStatus = 'todo' | 'in-progress' | 'done';

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  color: string;
  borderColor: string;
  icon: React.ElementType;
}

const columns: ColumnConfig[] = [
  { 
    id: 'todo', 
    title: 'To Do', 
    color: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30',
    icon: Circle 
  },
  { 
    id: 'in-progress', 
    title: 'In Progress', 
    color: 'from-brand-blue/20 to-cyan-500/20',
    borderColor: 'border-brand-blue/30',
    icon: ArrowRight 
  },
  { 
    id: 'done', 
    title: 'Done', 
    color: 'from-brand-teal/20 to-green-500/20',
    borderColor: 'border-brand-teal/30',
    icon: CheckCircle2 
  },
];

const priorityColors = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function TaskCard({ 
  task, 
  onMove, 
  onEdit, 
  onDelete 
}: { 
  task: Task; 
  onMove: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Card 
      className={`p-4 bg-white/5 border-white/10 hover:border-white/20 transition-all duration-300 group cursor-move ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
      draggable
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="w-4 h-4 text-white/20 mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-white truncate">{task.title}</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded">
                  <MoreHorizontal className="w-4 h-4 text-white/40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-brand-surface border-white/10">
                <DropdownMenuItem onClick={() => onEdit(task)} className="text-white/80">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(task.id)} 
                  className="text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <p className="text-xs text-white/50 mt-1 line-clamp-2">{task.description}</p>
          
          <div className="flex items-center gap-3 mt-3">
            <Badge 
              variant="outline" 
              className={`${priorityColors[task.priority]} text-[10px] px-1.5 py-0`}
            >
              {task.priority}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-white/40">
              <DollarSign className="w-3 h-3" />
              {task.reward.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Clock className="w-3 h-3" />
              {task.estimatedTime}m
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            {task.tags.map((tag) => (
              <span 
                key={tag}
                className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-white/40"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Move Buttons */}
      <div className="flex gap-1 mt-3 pt-3 border-t border-white/5">
        {task.status !== 'todo' && (
          <button 
            onClick={() => onMove(task.id, 'todo')}
            className="flex-1 py-1 text-[10px] text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
          >
            To Do
          </button>
        )}
        {task.status !== 'in-progress' && (
          <button 
            onClick={() => onMove(task.id, 'in-progress')}
            className="flex-1 py-1 text-[10px] text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
          >
            In Progress
          </button>
        )}
        {task.status !== 'done' && (
          <button 
            onClick={() => onMove(task.id, 'done')}
            className="flex-1 py-1 text-[10px] text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
          >
            Done
          </button>
        )}
      </div>
    </Card>
  );
}

function KanbanColumn({ 
  column, 
  tasks, 
  onMove, 
  onEdit, 
  onDelete,
  onAdd
}: { 
  column: ColumnConfig;
  tasks: Task[];
  onMove: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAdd: (status: TaskStatus) => void;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const Icon = column.icon;

  return (
    <div 
      ref={columnRef}
      className={`flex flex-col min-w-[300px] max-w-[400px] flex-1 rounded-xl border ${column.borderColor} bg-gradient-to-b ${column.color}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-white/60" />
          <h3 className="font-heading font-semibold text-white">{column.title}</h3>
          <Badge variant="secondary" className="bg-white/10 text-white/60">
            {tasks.length}
          </Badge>
        </div>
        <button 
          onClick={() => onAdd(column.id)}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-3 space-y-3 min-h-[300px]">
        {tasks.map((task) => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onMove={onMove}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

export function TaskOrganizer() {
  const { tasks, moveTask, addTask, updateTask, removeTask } = useAppStore();
  const sectionRef = useRef<HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    platform: '',
    reward: 0,
    estimatedTime: 0,
    priority: 'medium',
    tags: [],
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const triggers: ScrollTrigger[] = [];

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(
          section.querySelectorAll('.animate-item'),
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out' }
        );
      },
      once: true,
    });
    triggers.push(trigger);

    return () => {
      triggers.forEach(t => t.kill());
    };
  }, []);

  const handleMove = (taskId: string, newStatus: TaskStatus) => {
    moveTask(taskId, newStatus);
    
    // Trigger confetti effect for done tasks
    if (newStatus === 'done') {
      // Simple visual feedback
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // Could add confetti here
      }
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData(task);
    setDialogOpen(true);
  };

  const handleAdd = (status: TaskStatus) => {
    setEditingTask(null);
    setNewTaskStatus(status);
    setFormData({
      title: '',
      description: '',
      platform: '',
      reward: 0,
      estimatedTime: 0,
      priority: 'medium',
      tags: [],
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingTask) {
      updateTask(editingTask.id, formData);
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        title: formData.title || 'New Task',
        description: formData.description || '',
        platform: formData.platform || 'General',
        reward: formData.reward || 0,
        estimatedTime: formData.estimatedTime || 0,
        status: newTaskStatus,
        priority: (formData.priority as Task['priority']) || 'medium',
        tags: formData.tags || [],
        createdAt: new Date(),
      };
      addTask(newTask);
    }
    setDialogOpen(false);
  };

  const handleDelete = (taskId: string) => {
    removeTask(taskId);
  };

  // Calculate stats
  const totalEarnings = tasks
    .filter(t => t.status === 'done')
    .reduce((sum, t) => sum + t.reward, 0);
  const totalTime = tasks
    .filter(t => t.status === 'done')
    .reduce((sum, t) => sum + t.estimatedTime, 0);
  const completionRate = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) 
    : 0;

  return (
    <section 
      id="tasks" 
      ref={sectionRef}
      className="relative py-20 overflow-hidden"
    >
      <div className="relative z-10 section-container">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="animate-item">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-white mb-3">
              Task <span className="gradient-text">Flow</span>
            </h2>
            <p className="text-white/60 max-w-xl">
              Organize your survey tasks with our Kanban board. 
              Track progress, manage priorities, and maximize your efficiency.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 animate-item">
            <div className="glass-card px-4 py-3 text-center">
              <p className="text-xl font-bold text-brand-teal">${totalEarnings.toFixed(2)}</p>
              <p className="text-xs text-white/60">Completed</p>
            </div>
            <div className="glass-card px-4 py-3 text-center">
              <p className="text-xl font-bold text-brand-blue">{Math.round(totalTime / 60 * 10) / 10}h</p>
              <p className="text-xs text-white/60">Time Saved</p>
            </div>
            <div className="glass-card px-4 py-3 text-center">
              <p className="text-xl font-bold text-brand-purple">{completionRate}%</p>
              <p className="text-xs text-white/60">Completion</p>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 animate-item">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks.filter(t => t.status === column.id)}
              onMove={handleMove}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
            />
          ))}
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 glass-card animate-item">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-brand-teal mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-white mb-1">Pro Tip: Time Blocking</h4>
              <p className="text-sm text-white/60">
                Group similar tasks together and complete them in batches. 
                This reduces context switching and can increase your hourly rate by up to 25%.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-brand-surface border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editingTask ? 'Update task details below.' : 'Create a new task to track your progress.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Platform</label>
                <Input
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  placeholder="e.g. Swagbucks"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Reward ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.reward}
                  onChange={(e) => setFormData({ ...formData, reward: parseFloat(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Time (min)</label>
                <Input
                  type="number"
                  value={formData.estimatedTime}
                  onChange={(e) => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Tags (comma separated)</label>
              <Input
                value={formData.tags?.join(', ')}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()) })}
                placeholder="survey, quick, bonus"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-brand-purple to-brand-blue text-white"
              >
                {editingTask ? 'Save Changes' : 'Add Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
