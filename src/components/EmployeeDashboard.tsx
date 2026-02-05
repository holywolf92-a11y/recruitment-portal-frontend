import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, AlertCircle, FileText, TrendingUp } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../lib/authContext';
import { DailyLogForm } from './DailyLogForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface TodayStats {
  logsCreated: number;
  candidatesHandled: number;
  totalTimeSpent: number;
  pendingLogs: number;
}

interface RecentLog {
  id: string;
  candidate_name: string;
  task_type: string;
  description: string;
  time_spent_minutes: number;
  log_date: string;
  status: string;
}

export const EmployeeDashboard = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TodayStats>({
    logsCreated: 0,
    candidatesHandled: 0,
    totalTimeSpent: 0,
    pendingLogs: 0,
  });
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    console.log('[EmployeeDashboard] Component mounted, session:', session?.user?.email);
    fetchDashboardData();
  }, [refreshKey]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[EmployeeDashboard] Fetching data...');
      
      // Get auth token from session
      const token = session?.session?.access_token || session?.access_token;
      console.log('[EmployeeDashboard] Token available:', !!token);
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const today = new Date().toISOString().split('T')[0];
      console.log('[EmployeeDashboard] Calling API...');

      const response = await apiClient.get<any>('/api/employee-logs/logs', {
        params: {
          startDate: today,
          endDate: today,
          limit: 100,
        },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[EmployeeDashboard] API Response:', response);
      const logs = response.data || response || [];

      // Calculate stats
      const uniqueCandidates = new Set(logs.map((log: any) => log.candidate_id));
      const totalTime = logs.reduce((sum: number, log: any) => sum + (log.time_spent_minutes || 0), 0);
      const pending = logs.filter((log: any) => log.status === 'pending').length;

      setStats({
        logsCreated: logs.length,
        candidatesHandled: uniqueCandidates.size,
        totalTimeSpent: totalTime,
        pendingLogs: pending,
      });

      // Set recent logs (last 5)
      setRecentLogs(logs.slice(0, 5));
      console.log('[EmployeeDashboard] Dashboard loaded successfully');
    } catch (error) {
      console.error('[EmployeeDashboard] Error fetching dashboard data:', error);
      setError(`Failed to load dashboard data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📝 Daily Work Logbook</h1>
          <p className="text-gray-600 mt-1">Track your work activities and build accountability</p>
        </div>
        <DailyLogForm onSuccess={handleLogSuccess} />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-900">{error}</h3>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-700 hover:text-red-900 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Today's Logs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600">{stats.logsCreated}</span>
              <span className="text-xs text-gray-500">logs created</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date().toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {/* Candidates Handled */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Candidates Handled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">{stats.candidatesHandled}</span>
              <span className="text-xs text-gray-500">unique candidates</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Today
            </p>
          </CardContent>
        </Card>

        {/* Total Time Spent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Time Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-purple-600">{Math.round(stats.totalTimeSpent / 60)}</span>
              <span className="text-xs text-gray-500">hours</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {stats.totalTimeSpent} mins
            </p>
          </CardContent>
        </Card>

        {/* Pending Logs */}
        <Card className={stats.pendingLogs > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${stats.pendingLogs > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {stats.pendingLogs}
              </span>
              <span className="text-xs text-gray-500">logs pending</span>
            </div>
            {stats.pendingLogs === 0 && (
              <p className="text-xs text-green-600 mt-2">✓ All caught up!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📋 Today's Activity</CardTitle>
              <CardDescription>Your recent logs from today</CardDescription>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No logs yet today</p>
              <p className="text-sm text-gray-500 mb-4">
                Click "Add Daily Log" to start logging your work activities
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">{log.candidate_name}</p>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {log.task_type}
                      </Badge>
                      {log.status === 'pending' && (
                        <Badge variant="outline" className="flex-shrink-0">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{log.description}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.time_spent_minutes} mins
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">📌 Why Log Your Work?</p>
          <p>
            Daily logs create an audit trail, improve management visibility, and help resolve disputes. They're
            structured and candidate-linked — not casual notes.
          </p>
        </div>
      </div>
    </div>
  );
};
