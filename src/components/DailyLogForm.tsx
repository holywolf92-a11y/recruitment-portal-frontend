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
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    if (open) {
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

  return (
    <>
      <Button
        className="gap-2 bg-blue-600 hover:bg-blue-700 text-orange-200 hover:text-orange-100"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Plus className="w-4 h-4" />
        Add Daily Log
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
        <DialogHeader>
          <DialogTitle>📝 Add Daily Work Log</DialogTitle>
          <DialogDescription>
            Log the work you've done today for a candidate. The log date is auto-set to today.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Candidate Selection */}
          <div className="space-y-2">
            <Label htmlFor="candidate" className="text-sm font-medium">
              Candidate <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.candidate_id} onValueChange={(value) =>
              setFormData({ ...formData, candidate_id: value })
            }>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a candidate..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {loadingCandidates ? (
                  <div className="p-3 text-sm text-gray-500">Loading candidates...</div>
                ) : candidates.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No candidates found</div>
                ) : (
                  candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name} ({candidate.candidate_code})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Task Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="task-type" className="text-sm font-medium">
              Task Type <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.task_type_id} onValueChange={(value) =>
              setFormData({ ...formData, task_type_id: value })
            }>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a task type..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {loadingTaskTypes ? (
                  <div className="p-3 text-sm text-gray-500">Loading task types...</div>
                ) : taskTypes.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No task types available</div>
                ) : (
                  taskTypes.map((taskType) => (
                    <SelectItem key={taskType.id} value={taskType.id}>
                      {taskType.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="What exactly did you do? Be specific..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">Be specific about the work performed.</p>
          </div>

          {/* Time Spent */}
          <div className="space-y-2">
            <Label htmlFor="time-spent" className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Spent (minutes)
            </Label>
            <Input
              id="time-spent"
              type="number"
              min="0"
              max="480"
              value={formData.time_spent_minutes}
              onChange={(e) =>
                setFormData({ ...formData, time_spent_minutes: parseInt(e.target.value) || 0 })
              }
              className="w-full"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
              <p className="text-sm text-green-700">✓ Log created successfully!</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Log'}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            💡 Logs must be structured and candidate-linked. This ensures accountability and audit trails.
          </p>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
