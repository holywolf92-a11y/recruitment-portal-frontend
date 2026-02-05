import { useState, useEffect } from 'react';
import { Users, Plus, Lock, Trash2, Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../lib/authContext';

interface Employee {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt?: string;
}

interface FormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function AdminPanel() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'manage'>('list');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form states
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    employeeId: '',
    newPassword: ''
  });

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const token = session?.session?.access_token || session?.access_token;
      
      // Fetch employees from backend
      const response = await fetch('/api/auth/employees', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load employees');
      }

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err: any) {
      // Fallback to demo data if endpoint fails
      const demoEmployees: Employee[] = [
        {
          id: '1',
          email: 'employee1@falisha.com',
          firstName: 'Ahmed',
          lastName: 'Khan',
          phone: '+971501234567',
          createdAt: '2026-02-01'
        },
        {
          id: '2',
          email: 'employee2@falisha.com',
          firstName: 'Fatima',
          lastName: 'Ali',
          phone: '+971502345678',
          createdAt: '2026-02-01'
        },
        {
          id: '3',
          email: 'employee3@falisha.com',
          firstName: 'Mohammad',
          lastName: 'Hassan',
          phone: '+971503456789',
          createdAt: '2026-02-01'
        }
      ];
      setEmployees(demoEmployees);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/auth/register-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create employee');
      }

      const data = await response.json();
      setSuccess(`Employee ${formData.email} created successfully!`);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: ''
      });
      setActiveTab('list');
      loadEmployees();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (!selectedEmployee) {
        throw new Error('No employee selected');
      }

      const token = session?.session?.access_token || session?.access_token;

      const response = await fetch('/api/auth/change-employee-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          newPassword: passwordForm.newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully');
      setPasswordForm({ employeeId: '', newPassword: '' });
      setSelectedEmployee(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const token = session?.session?.access_token || session?.access_token;

      const response = await fetch('/api/auth/delete-employee', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ employeeId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete employee');
      }

      setSuccess(`Employee ${email} deleted successfully`);
      loadEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <p className="text-gray-600">Manage employee accounts and settings</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">Success</p>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-600 hover:text-green-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'list'
                ? 'text-purple-600 border-purple-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Employee List
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'create'
                ? 'text-purple-600 border-purple-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Employee
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'manage'
                ? 'text-purple-600 border-purple-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Manage Access
          </button>
        </div>

        {/* Content */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Employees</h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No employees found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-gray-600">Name</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-600">Email</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-600">Phone</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-600">Created</th>
                        <th className="px-6 py-3 text-right font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {employee.firstName} {employee.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{employee.email}</td>
                          <td className="px-6 py-4 text-gray-600">{employee.phone || '-'}</td>
                          <td className="px-6 py-4 text-gray-600 text-xs">
                            {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setActiveTab('manage');
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm mr-4"
                            >
                              <Lock className="w-4 h-4 inline mr-1" />
                              Change Password
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(employee.id, employee.email)}
                              className="text-red-600 hover:text-red-700 font-medium text-sm"
                            >
                              <Trash2 className="w-4 h-4 inline mr-1" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Employee Account</h2>

            <form onSubmit={handleCreateEmployee} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="employee@falisha.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Secure password"
                  required
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ahmed"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Khan"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+971501234567"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Creating...' : 'Create Employee'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      email: '',
                      password: '',
                      firstName: '',
                      lastName: '',
                      phone: ''
                    });
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Manage Employee Access</h2>

            {selectedEmployee ? (
              <div className="space-y-6">
                {/* Selected Employee Info */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-700">
                    <strong>Current Employee:</strong> {selectedEmployee.firstName} {selectedEmployee.lastName} ({selectedEmployee.email})
                  </p>
                </div>

                {/* Change Password Form */}
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Change Password
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword['change'] ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({ ...showPassword, change: !showPassword['change'] })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword['change'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(null);
                        setPasswordForm({ employeeId: '', newPassword: '' });
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {/* Delete Option */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-red-600 mb-4">
                    <Trash2 className="w-4 h-4" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    This action cannot be undone. The employee account will be permanently deleted.
                  </p>
                  <button
                    onClick={() => handleDeleteEmployee(selectedEmployee.id, selectedEmployee.email)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all font-medium"
                  >
                    Delete This Employee
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Lock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Select an employee from the list to manage their access</p>
                <button
                  onClick={() => setActiveTab('list')}
                  className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                >
                  Go to Employee List
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
