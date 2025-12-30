import { create } from 'zustand'
import { League } from '../types'

interface AppState {
  // Selected country for import
  selectedCountry: string | null
  setSelectedCountry: (country: string | null) => void
  
  // Configured leagues
  configuredLeagues: Set<number>
  addConfiguredLeague: (leagueId: number) => void
  removeConfiguredLeague: (leagueId: number) => void
  clearConfiguredLeagues: () => void
  
  // Bet Finder settings
  selectedMatchCount: number
  setSelectedMatchCount: (count: number) => void
  selectedTopCount: number
  setSelectedTopCount: (count: number) => void
  
  // UI state
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Country selection
  selectedCountry: null,
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  
  // Configured leagues
  configuredLeagues: new Set<number>(),
  addConfiguredLeague: (leagueId) =>
    set((state) => ({
      configuredLeagues: new Set(state.configuredLeagues).add(leagueId),
    })),
  removeConfiguredLeague: (leagueId) =>
    set((state) => {
      const newSet = new Set(state.configuredLeagues)
      newSet.delete(leagueId)
      return { configuredLeagues: newSet }
    }),
  clearConfiguredLeagues: () => set({ configuredLeagues: new Set<number>() }),
  
  // Bet Finder settings
  selectedMatchCount: 10,
  setSelectedMatchCount: (count) => set({ selectedMatchCount: count }),
  selectedTopCount: 10,
  setSelectedTopCount: (count) => set({ selectedTopCount: count }),
  
  // UI state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
