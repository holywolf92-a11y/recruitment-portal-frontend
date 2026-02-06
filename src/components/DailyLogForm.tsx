import { useState, useEffect } from 'react';
import { X, Clock, MapPin, AlertCircle, Plus } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../lib/authContext';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface TaskType {
  id: string;
  name: string;
  description?: string;
}

interface Candidate {
  id: string;
  name: string;
  candidate_code: string;
}

interface DailyLogFormProps {
  onSuccess?: () => void;
  candidateId?: string;
}

export const DailyLogForm = ({ onSuccess, candidateId }: DailyLogFormProps) => {
  console.log('[DailyLogForm] Component render');
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  console.log('[DailyLogForm] State:', { open, loading });
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingTaskTypes, setLoadingTaskTypes] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  const token = (session as any)?.access_token || (session as any)?.session?.access_token;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const [formData, setFormData] = useState({
    candidate_id: candidateId || '',
    task_type_id: '',
    description: '',
    time_spent_minutes: 30,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('[DailyLogForm] useEffect - open changed to:', open);
    if (open) {
      console.log('[DailyLogForm] Dialog opened, fetching data...');
      fetchTaskTypes();
      fetchCandidates();
    }
  }, [open]);

  const fetchTaskTypes = async () => {
    try {
      setLoadingTaskTypes(true);
      const response = await apiClient.get<{ success: boolean; data: TaskType[] }>('/employee-logs/task-types', {
        headers: authHeaders,
      });
      setTaskTypes(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch task types:', err);
      setError('Failed to load task types');
    } finally {
      setLoadingTaskTypes(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const response = await apiClient.get<{ candidates: Candidate[] }>('/candidates', {
        params: { limit: 1000 },
      });
      setCandidates(response.candidates || []);
    } catch (err: any) {
      console.error('Failed to fetch candidates:', err);
      setError('Failed to load candidates');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.candidate_id || !formData.task_type_id || !formData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/employee-logs/logs', {
        candidate_id: formData.candidate_id,
        task_type_id: formData.task_type_id,
        description: formData.description.trim(),
        time_spent_minutes: formData.time_spent_minutes,
      }, {
        headers: authHeaders,
      });

      setSuccess(true);
      setFormData({
        candidate_id: candidateId || '',
        task_type_id: '',
        description: '',
        time_spent_minutes: 30,
      });

      setTimeout(() => {
        setOpen(false);
        onSuccess?.();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to create log:', err);
      setError(err.response?.data?.error || 'Failed to create log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const candidateSearch = formData.candidate_id
    ? candidates.find((c) => c.id === formData.candidate_id)?.name
    : 'Select a candidate...';

  console.log('[DailyLogForm] Rendering return with open =', open);
  
  return (
    <>
      <Button
        className="gap-2 bg-blue-600 hover:bg-blue-700 text-orange-200 hover:text-orange-100"
        type="button"
        onClick={(e) => {
          console.log('[DailyLogForm] Button clicked!');
          e.preventDefault();
          e.stopPropagation();
          console.log('[DailyLogForm] Calling setOpen(true)...');
          setOpen(true);
          console.log('[DailyLogForm] setOpen(true) called');
        }}
      >
        <Plus className="w-4 h-4" />
        Add Daily Log
      </Button>

      {/* FALLBACK: Simple HTML modal when Radix fails */}
      {open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }} onClick={() => setOpen(false)}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>📝 Add Daily Work Log</h2>
              <p style={{ fontSize: '14px', color: '#666' }}>Log the work you've done today for a candidate.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Candidate */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Candidate <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={formData.candidate_id}
                  onChange={(e) => setFormData({ ...formData, candidate_id: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                >
                  <option value="">Select a candidate...</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.candidate_code})</option>
                  ))}
                </select>
              </div>

              {/* Tasktype */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Task Type <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={formData.task_type_id}
                  onChange={(e) => setFormData({ ...formData, task_type_id: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                >
                  <option value="">Select a task type...</option>
                  {taskTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Description <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What exactly did you do? Be specific..."
                  rows={4}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Time Spent */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Time Spent (minutes)
                </label>
                <input
                  type="number"
                  value={formData.time_spent_minutes}
                  onChange={(e) => setFormData({ ...formData, time_spent_minutes: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="480"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              {/* Error/Success */}
              {error && <div style={{ padding: '12px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00' }}>{error}</div>}
              {success && <div style={{ padding: '12px', backgroundColor: '#efe', border: '1px solid #cfc', borderRadius: '4px', color: '#0a0' }}>✓ Log created successfully!</div>}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '4px', background: '#2563eb', color: 'white', cursor: 'pointer' }}
                >
                  {loading ? 'Creating...' : 'Create Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
