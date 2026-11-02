import { ClipboardList, FolderKanban, LayoutDashboard } from 'lucide-react'

export const navigation = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'A shared overview of the team’s drafting work.',
    placeholder: 'Workstream summaries will appear here once project data is connected.',
  },
  {
    path: '/projects',
    label: 'Projects',
    icon: FolderKanban,
    description: 'One place for client projects and their independent workstreams.',
  },
  {
    path: '/my-work',
    label: 'My Work',
    icon: ClipboardList,
    description: 'Your assignments, priorities, and upcoming deadlines.',
  },
]
