import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Briefcase, Building2, MapPin, DollarSign, Users, RefreshCw, AlertCircle, Clock, X, ChevronDown } from 'lucide-react';
import { apiClient, EmployerLeadProfile } from '../lib/apiClient';

const STATUS_OPTIONS = ['New', 'Active', 'Contacted', 'Closed'];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  New: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  Active: 'bg-green-100 text-green-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  Contacted: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-600',
  Closed: 'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = {
  company_name: '',
  contact_name: '',
  email: '',
  phone_number: '',
  country: '',
  city: '',
  professions: '',
  quantity: '',
  salary_range: '',
  duty_hours: '',
  contract_duration: '',
  benefits_included: '',
  comments: '',
  status: 'New',
};

type FormData = typeof EMPTY_FORM;

export function JobOrderManagement() {
  const [orders, setOrders] = useState<EmployerLeadProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Company name suggestions from existing leads
  const [companies, setCompanies] = useState<{company_name: string; contact_name: string | null; email: string | null; phone_number: string | null}[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getAdminEmployerLeads({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 300,
      });
      setOrders(result.leads);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load job orders');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Load company list for suggestions
  useEffect(() => {
    apiClient.getAdminEmployerLeads({ dedupe: true, limit: 200 })
      .then(r => {
        const unique = r.leads
          .filter(l => l.company_name)
          .map(l => ({ company_name: l.company_name!, contact_name: l.contact_name, email: l.email, phone_number: l.phone_number }));
        setCompanies(unique);
      })
      .catch(() => {});
  }, []);

  const handleCompanySelect = (company: typeof companies[0]) => {
    setForm(f => ({
      ...f,
      company_name: company.company_name,
      contact_name: company.contact_name || f.contact_name,
      email: company.email || f.email,
      phone_number: company.phone_number || f.phone_number,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim() || !form.professions.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.createAdminEmployerLead(form);
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create job order');
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = orders.filter(o => o.status?.toLowerCase() === 'new' || o.status?.toLowerCase() === 'active').length;
  const closedCount = orders.filter(o => o.status?.toLowerCase() === 'closed').length;
  const countries = new Set(orders.map(o => o.country).filter(Boolean)).size;

  // Companies for suggestions filtered by typed name
  const companySuggestions = companies.filter(c =>
    form.company_name.length > 1 && c.company_name.toLowerCase().includes(form.company_name.toLowerCase())
  ).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Job Orders</h2>
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${total} job requirement${total !== 1 ? 's' : ''} from employers`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Job Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by position, company, country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-700 font-medium">Failed to load job orders</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button onClick={load} className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Retry</button>
        </div>
      )}

      {/* Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
              <div className="h-24 bg-gray-200" />
              <div className="p-6 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && orders.length === 0 && !error && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {debouncedSearch || statusFilter !== 'all' ? 'No job orders match your filters' : 'No job orders yet'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Create your first job order
          </button>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Card header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white text-base font-semibold leading-tight">
                        {order.professions || 'Unspecified Position'}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-green-100">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{order.company_name || 'Unknown Company'}</span>
                      </div>
                    </div>
                  </div>
                  {order.status && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${STATUS_COLORS[order.status] || 'bg-white bg-opacity-20 text-white'}`}>
                      {order.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 grid grid-cols-2 gap-3">
                {(order.country || order.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm">{[order.city, order.country].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                )}
                {order.salary_range && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Salary</p>
                      <p className="text-sm">{order.salary_range}</p>
                    </div>
                  </div>
                )}
                {order.quantity && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Required</p>
                      <p className="text-sm">{order.quantity} worker{parseInt(order.quantity) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}
                {order.contract_duration && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Contract</p>
                      <p className="text-sm">{order.contract_duration}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
                Posted {new Date(order.created_at || '').toLocaleDateString()}
                {order.duty_hours && <> &bull; {order.duty_hours} hrs/day</>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="mb-4">Job Order Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900">{total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 mb-1">Open / Active</p>
              <p className="text-2xl font-bold text-green-900">{openCount}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Closed</p>
              <p className="text-2xl font-bold text-gray-900">{closedCount}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 mb-1">Countries</p>
              <p className="text-2xl font-bold text-purple-900">{countries}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold">Create Job Order</h2>
              <button
                onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setSubmitError(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name with autocomplete */}
                <div className="relative md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Start typing to search existing employers..."
                    required
                  />
                  {companySuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      {companySuggestions.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleCompanySelect(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                        >
                          <span className="font-medium">{c.company_name}</span>
                          {c.contact_name && <span className="text-gray-500 ml-2">— {c.contact_name}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input type="text" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. UAE, Saudi Arabia" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position / Professions Required <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={form.professions} onChange={e => setForm(f => ({ ...f, professions: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Electrician, Plumber, Driver" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Needed</label>
                  <input type="text" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
                  <input type="text" value={form.salary_range} onChange={e => setForm(f => ({ ...f, salary_range: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. AED 2,000 - 2,500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duty Hours</label>
                  <input type="text" value={form.duty_hours} onChange={e => setForm(f => ({ ...f, duty_hours: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 8" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Duration</label>
                  <input type="text" value={form.contract_duration} onChange={e => setForm(f => ({ ...f, contract_duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 2 years" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Benefits Included</label>
                  <input type="text" value={form.benefits_included} onChange={e => setForm(f => ({ ...f, benefits_included: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Accommodation, Food, Medical" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Comments</label>
                  <textarea value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Any special requirements or notes..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setSubmitError(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.company_name.trim() || !form.professions.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? 'Creating...' : 'Create Job Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
