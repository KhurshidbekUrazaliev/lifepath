import { ProgressType } from './types';

export interface FolderTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  progressType: ProgressType;
  unit: string;
  tagline: string;
  taskPlaceholder: string;
  defaultTarget: number;
  targetLabel: string;
  showResources: boolean;
}

export const PALETTE = [
  '#6C63FF', // iris
  '#FF6B5B', // coral
  '#14B8A6', // teal
  '#F59E0B', // amber
  '#3B82F6', // sky
  '#EC4899', // pink
  '#22C55E', // leaf
  '#A855F7', // violet
  '#0EA5E9', // ocean
  '#F97316', // tangerine
  '#64748B', // slate
  '#E11D48', // ruby
];

export const ICONS = [
  '📚', '💪', '🗣️', '🎓', '🏃', '🎨', '💰', '🧘', '🎸', '✍️', '💼', '🏠',
  '🍳', '🌱', '🧠', '🎮', '📷', '🧩', '🚴', '🏊', '💻', '🎬', '✈️', '❤️',
];

export const TEMPLATES: FolderTemplate[] = [
  {
    id: 'reading', name: 'Reading', icon: '📚', color: '#6C63FF', progressType: 'units', unit: 'pages',
    tagline: 'Track books page by page', taskPlaceholder: 'Sherlock Holmes', defaultTarget: 300,
    targetLabel: 'Total pages', showResources: false,
  },
  {
    id: 'gym', name: 'Gym', icon: '💪', color: '#FF6B5B', progressType: 'sessions', unit: 'sessions',
    tagline: 'Sessions per muscle group', taskPlaceholder: 'Shoulders', defaultTarget: 12,
    targetLabel: 'Sessions in this cycle', showResources: false,
  },
  {
    id: 'languages', name: 'Languages', icon: '🗣️', color: '#14B8A6', progressType: 'milestones', unit: 'steps',
    tagline: 'Goals, milestones, resources', taskPlaceholder: 'Spanish B1', defaultTarget: 0,
    targetLabel: 'Milestones', showResources: true,
  },
  {
    id: 'study', name: 'Study', icon: '🎓', color: '#3B82F6', progressType: 'time', unit: 'min',
    tagline: 'Hours toward a course or exam', taskPlaceholder: 'Linear algebra', defaultTarget: 1200,
    targetLabel: 'Total minutes', showResources: true,
  },
  {
    id: 'running', name: 'Running', icon: '🏃', color: '#22C55E', progressType: 'units', unit: 'km',
    tagline: 'Distance toward a goal', taskPlaceholder: 'October 50 km', defaultTarget: 50,
    targetLabel: 'Total km', showResources: false,
  },
  {
    id: 'creative', name: 'Creative', icon: '🎨', color: '#EC4899', progressType: 'time', unit: 'min',
    tagline: 'Practice time on your craft', taskPlaceholder: 'Guitar practice', defaultTarget: 600,
    targetLabel: 'Total minutes', showResources: true,
  },
  {
    id: 'money', name: 'Money', icon: '💰', color: '#F59E0B', progressType: 'units', unit: '₩',
    tagline: 'Savings goals', taskPlaceholder: 'Emergency fund', defaultTarget: 1000000,
    targetLabel: 'Target amount', showResources: false,
  },
  {
    id: 'wellness', name: 'Wellness', icon: '🧘', color: '#A855F7', progressType: 'sessions', unit: 'sessions',
    tagline: 'Meditation, sleep, recovery', taskPlaceholder: 'Morning meditation', defaultTarget: 30,
    targetLabel: 'Sessions', showResources: false,
  },
  {
    id: 'custom', name: 'Custom', icon: '✨', color: '#0EA5E9', progressType: 'units', unit: 'units',
    tagline: 'Build your own', taskPlaceholder: 'My goal', defaultTarget: 10,
    targetLabel: 'Target', showResources: true,
  },
];

export function templateById(id: string): FolderTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1];
}

export const PROGRESS_TYPES: { id: ProgressType; label: string; hint: string; icon: string }[] = [
  { id: 'units', label: 'Amount', hint: 'pages, km, chapters', icon: '📏' },
  { id: 'time', label: 'Time', hint: 'minutes toward a total', icon: '⏱️' },
  { id: 'sessions', label: 'Sessions', hint: 'count each workout/practice', icon: '🔁' },
  { id: 'milestones', label: 'Milestones', hint: 'checklist of steps', icon: '🪜' },
];

/** Quick-pick amounts shown in the log sheet. */
export function quickAmounts(type: ProgressType, target: number): number[] {
  if (type === 'time') return [10, 15, 30, 45, 60];
  if (type === 'sessions') return [1];
  if (target >= 100000) return [10000, 50000, 100000];
  if (target >= 1000) return [10, 25, 50, 100];
  if (target >= 100) return [5, 10, 20, 30];
  return [1, 2, 5];
}
