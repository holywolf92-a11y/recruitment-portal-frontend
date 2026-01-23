import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiClient, Candidate, CandidateFilters } from './apiClient';

interface CandidateContextType {
  // State
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchCandidates: (filters?: CandidateFilters) => Promise<void>;
  refreshCandidates: () => Promise<void>;
  updateCandidateInList: (candidateId: string, updates: Partial<Candidate>) => void;
  removeCandidateFromList: (candidateId: string) => void;
  
  // Current filters (for reference)
  currentFilters: CandidateFilters;
}

const CandidateContext = createContext<CandidateContextType | undefined>(undefined);

export const useCandidates = () => {
  const context = useContext(CandidateContext);
  if (!context) {
    throw new Error('useCandidates must be used within a CandidateProvider');
  }
  return context;
};

interface CandidateProviderProps {
  children: ReactNode;
}

export const CandidateProvider: React.FC<CandidateProviderProps> = ({ children }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<CandidateFilters>({});

  // Fetch candidates with optional filters
  const fetchCandidates = useCallback(async (filters: CandidateFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[CandidateContext] Fetching candidates with filters:', filters);
      const response = await apiClient.getCandidates(filters);
      console.log('[CandidateContext] Fetched candidates:', response.candidates?.length || 0);
      setCandidates(response.candidates || []);
      setCurrentFilters(filters);
    } catch (e: any) {
      console.error('[CandidateContext] Error fetching candidates:', e);
      setError(e?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh candidates with current filters
  const refreshCandidates = useCallback(async () => {
    console.log('[CandidateContext] Refreshing candidates with current filters:', currentFilters);
    await fetchCandidates(currentFilters);
  }, [fetchCandidates, currentFilters]);

  // Update a specific candidate in the list (optimistic update)
  const updateCandidateInList = useCallback((candidateId: string, updates: Partial<Candidate>) => {
    setCandidates(prev => 
      prev.map(c => c.id === candidateId ? { ...c, ...updates } : c)
    );
  }, []);

  // Remove a candidate from the list
  const removeCandidateFromList = useCallback((candidateId: string) => {
    setCandidates(prev => prev.filter(c => c.id !== candidateId));
  }, []);

  const value: CandidateContextType = {
    candidates,
    loading,
    error,
    fetchCandidates,
    refreshCandidates,
    updateCandidateInList,
    removeCandidateFromList,
    currentFilters,
  };

  return (
    <CandidateContext.Provider value={value}>
      {children}
    </CandidateContext.Provider>
  );
};
