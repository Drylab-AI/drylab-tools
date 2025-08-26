import { create } from 'zustand'

export type SidebarItem = 'Tools' | 'Results' | null

interface SidebarState {
  isCollapsed: boolean
  activeItem: SidebarItem
  toggleCollapse: () => void
  setActiveItem: (item: SidebarItem) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  activeItem: 'Tools',
  toggleCollapse: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  setActiveItem: (item) => set({ activeItem: item })
}))


