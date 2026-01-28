// Lightweight API client using fetch with Vite base URL
// In production, VITE_API_BASE_URL should be set to the full backend URL (e.g., https://backend.railway.app/api)
// In development, it defaults to '/api' which will use the Vite proxy

// Production backend URL (fallback if VITE_API_BASE_URL is not set at build time)
const PRODUCTION_BACKEND_URL = 'https://recruitment-portal-backend-production-d1f7.up.railway.app/api';

// Determine API base URL
// Priority: 1. VITE_API_BASE_URL env var (set at build time), 2. Production fallback, 3. Default /api
const getApiBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  
  // If env var is set and not empty, use it
  if (envUrl && envUrl !== '/api' && envUrl.trim() !== '') {
    return envUrl;
  }
  
  // In production (not localhost), use production backend URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return PRODUCTION_BACKEND_URL;
  }
  
  // Default to /api for local development
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Log API base URL for debugging
console.log('[API Client] API_BASE_URL:', API_BASE_URL);
console.log('[API Client] Environment:', import.meta.env.MODE);
console.log('[API Client] Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  // Some endpoints may return 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// Types based on backend services
export interface InboxMessage {
  id: string;
  source: string;
  external_message_id?: string;
  payload?: any;
  status?: string;
  received_at?: string;
}

export interface InboxMessageList {
  messages: InboxMessage[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface Attachment {
  id: string;
  inbox_message_id: string;
  candidate_id?: string | null;
  storage_bucket?: string;
  storage_path?: string;
  file_name?: string;
  mime_type?: string | null;
  sha256?: string;
  attachment_type?: string;
  created_at?: string;
}

export interface ParsingJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error_message?: string;
  attachment_id?: string;
  candidate_id?: string;
}

export const api = {
  async listInboxMessages(params?: { limit?: number; offset?: number; source?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.limit != null) query.set('limit', String(params.limit));
    if (params?.offset != null) query.set('offset', String(params.offset));
    if (params?.source) query.set('source', params.source);
    if (params?.status) query.set('status', params.status);
    return request<InboxMessageList>(`/cv-inbox?${query.toString()}`);
  },

  async listAttachments(messageId: string) {
    return request<Attachment[]>(`/cv-inbox/${messageId}/attachments`);
  },

  async createInboxMessage(data: { source?: string; status?: string; payload?: any; received_at?: string; external_message_id?: string }) {
    return request<InboxMessage>('/cv-inbox', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadAttachment(
    messageId: string,
    data: {
      file_base64: string;
      file_name?: string;
      mime_type?: string;
      attachment_type?: string;
      candidate_id?: string;
      storage_bucket?: string;
      storage_path?: string;
    }
  ) {
    return request<Attachment>(`/cv-inbox/${messageId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteAttachment(attachmentId: string) {
    return request<Attachment>(`/cv-inbox/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },

  async triggerParsing(attachmentId: string) {
    // Week 4 planned endpoint; backend may not have it yet
    return request<{ job_id: string; status: string }>(`/cv-inbox/attachments/${attachmentId}/process`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async getParsingJob(jobId: string) {
    return request<ParsingJob>(`/parsing-jobs/${jobId}`);
  },
};

export interface Candidate {
  id: string;
  candidate_code: string;
  name: string;
  father_name?: string;
  status?: 'Applied' | 'Pending' | 'Deployed' | 'Cancelled' | string;
  source?: 'WhatsApp' | 'Email' | 'Form' | 'Manual' | string;
  ai_score?: number;
  auto_extracted?: boolean;
  needs_review?: boolean;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  address?: string;
  cnic?: string;
  passport?: string;
  
  // Document Checklist Status
  passport_received?: boolean;
  passport_received_at?: string;
  cnic_received?: boolean;
  cnic_received_at?: string;
  driving_license_received?: boolean;
  driving_license_received_at?: string;
  police_character_received?: boolean;
  police_character_received_at?: string;
  degree_received?: boolean;
  degree_received_at?: string;
  medical_received?: boolean;
  medical_received_at?: string;
  visa_received?: boolean;
  visa_received_at?: string;

  // Candidate card doc flags (migration 012)
  cv_received?: boolean;
  cv_received_at?: string;
  photo_received?: boolean;
  photo_received_at?: string;
  certificate_received?: boolean;
  certificate_received_at?: string;
  
  // Profile photo (migration 013)
  profile_photo_url?: string;
  profile_photo_signed_url?: string;
  profile_photo_bucket?: string;
  profile_photo_path?: string;
  
  // CV Extraction Fields
  nationality?: string;
  position?: string;
  experience_years?: number;
  country_of_interest?: string;
  skills?: string;
  languages?: string;
  education?: string;
  certifications?: string;
  previous_employment?: string;
  passport_expiry?: string;
  professional_summary?: string;
  
  // Extraction metadata
  extraction_confidence?: Record<string, number>;
  extraction_source?: string;
  extracted_at?: string;
  
  // Progressive data completion
  field_sources?: Record<string, { field: string; source: string; updated_at: string; updated_by?: string }>;
  missing_fields?: string[];
  
  created_at: string;
  updated_at: string;
}

export interface CreateCandidateData {
  name: string;
  father_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  address?: string;
  cnic?: string;
  passport?: string;

  // Document checklist (optional)
  passport_received?: boolean;
  cnic_received?: boolean;
  degree_received?: boolean;
  medical_received?: boolean;
  visa_received?: boolean;
  
  // CV Extraction Fields
  nationality?: string;
  position?: string;
  experience_years?: number;
  country_of_interest?: string;
  skills?: string;
  languages?: string;
  education?: string;
  certifications?: string;
  previous_employment?: string;
  passport_expiry?: string;
  professional_summary?: string;
  extraction_confidence?: Record<string, number>;
  extraction_source?: string;
}

export interface CandidateFilters {
  search?: string;
  status?: string;
  position?: string;
  country_of_interest?: string;
  documents?: 'complete' | 'missing' | string;
  applied_from?: string; // ISO date string (YYYY-MM-DD or full ISO datetime)
  applied_to?: string; // ISO date string (YYYY-MM-DD or full ISO datetime)
  sort_by?: string; // Column name to sort by
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CandidatesResponse {
  candidates: Candidate[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface Document {
  id: string;
  candidate_id: string;
  doc_type: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  sha256?: string;
  is_primary: boolean;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  candidate_id: string;
  occurred_at: string;
  event_category: string;
  event_type: string;
  actor_user_id?: string;
  metadata?: Record<string, any>;
}

export interface TimelineFilters {
  limit?: number;
  offset?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  total: number;
}

export interface Employer {
  id: string;
  company_name: string;
  created_at: string;
}

export interface CreateEmployerData {
  company_name: string;
}

export interface EmployerFilters {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface EmployersResponse {
  employers: Employer[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface JobOrder {
  id: string;
  job_code: string;
  employer_id: string;
}

export interface JobOrderWithEmployer extends JobOrder {
  employer?: {
    id: string;
    company_name: string;
  };
}

export interface CreateJobOrderData {
  job_code: string;
  employer_id: string;
}

export interface JobOrderFilters {
  search?: string;
  employer_id?: string;
  limit?: number;
  offset?: number;
}

export interface JobOrdersResponse {
  jobOrders: (JobOrder | JobOrderWithEmployer)[];
  total: number;
  limit?: number;
  offset?: number;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Avoid infinite spinners if the backend hangs or a network request never resolves.
    // Only apply our timeout when the caller didn't provide a signal.
    const method = (options.method || 'GET').toUpperCase();
    const timeoutMs = method === 'GET' ? 30000 : 60000;
    const controller = options.signal ? null : new AbortController();
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
        signal: options.signal || controller?.signal,
      });
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error(`API Error: timeout after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} ${error}`);
    }

    return response.json();
  }

  // Candidates API
  async getCandidates(filters: CandidateFilters = {}): Promise<CandidatesResponse> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.position && filters.position !== 'all') params.append('position', filters.position);
    if (filters.country_of_interest && filters.country_of_interest !== 'all') params.append('country_of_interest', filters.country_of_interest);
    if (filters.documents && filters.documents !== 'all') params.append('documents', filters.documents);
    if (filters.applied_from) params.append('applied_from', filters.applied_from);
    if (filters.applied_to) params.append('applied_to', filters.applied_to);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return this.request<CandidatesResponse>(`/candidates${query ? `?${query}` : ''}`);
  }

  /**
   * Get daily stats for Excel-style report cards
   */
  async getDailyStats(filters: {
    search?: string;
    position?: string;
    country_of_interest?: string;
    documents?: 'complete' | 'missing' | string;
    applied_from?: string;
    applied_to?: string;
  }): Promise<{
    total: number;
    applied: number;
    verified: number;
    pending: number;
    rejected: number;
    documents_uploaded: number;
  }> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.position && filters.position !== 'all') params.append('position', filters.position);
    if (filters.country_of_interest && filters.country_of_interest !== 'all') params.append('country_of_interest', filters.country_of_interest);
    if (filters.documents && filters.documents !== 'all') params.append('documents', filters.documents);
    if (filters.applied_from) params.append('applied_from', filters.applied_from);
    if (filters.applied_to) params.append('applied_to', filters.applied_to);
    
    const query = params.toString();
    return this.request(`/candidates/daily-stats${query ? `?${query}` : ''}`);
  }

  /**
   * Export candidates to CSV or Excel
   */
  async exportCandidates(filters: CandidateFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.position && filters.position !== 'all') params.append('position', filters.position);
    if (filters.country_of_interest && filters.country_of_interest !== 'all') params.append('country_of_interest', filters.country_of_interest);
    if (filters.documents && filters.documents !== 'all') params.append('documents', filters.documents);
    if (filters.applied_from) params.append('applied_from', filters.applied_from);
    if (filters.applied_to) params.append('applied_to', filters.applied_to);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);

    const url = `${API_BASE_URL}/candidates/export?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Export failed: ${response.status} ${error}`);
    }
    return response.blob();
  }

  async bulkUpdateCandidateStatus(candidateIds: string[], status: string): Promise<{ updated: number; candidates: Array<{ id: string; status: string }> }> {
    return this.request(`/candidates/bulk/status`, {
      method: 'PATCH',
      body: JSON.stringify({ candidateIds, status }),
    });
  }

  async getCandidate(id: string): Promise<Candidate> {
    const response = await this.request<{ candidate: Candidate }>(`/candidates/${id}`);
    return response.candidate;
  }

  async createCandidate(data: CreateCandidateData): Promise<Candidate> {
    const response = await this.request<{ candidate: Candidate }>('/candidates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.candidate;
  }

  async updateCandidate(id: string, data: Partial<CreateCandidateData>): Promise<Candidate> {
    const response = await this.request<{ candidate: Candidate }>(`/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.candidate;
  }

  /**
   * Get missing fields for a candidate
   */
  async getMissingFields(candidateId: string): Promise<{
    missing_fields: string[];
    missing_fields_with_info: Array<{
      field: string;
      label: string;
      source: string | null;
      canBeManuallyUpdated: boolean;
      hint: string;
    }>;
    total_missing: number;
  }> {
    return this.request(`/candidates/${candidateId}/missing-fields`);
  }

  /**
   * Update a candidate field manually (highest priority - never overwritten)
   */
  async updateCandidateFieldManually(
    candidateId: string,
    field: string,
    value: any
  ): Promise<{ success: boolean; candidate: Candidate; message: string }> {
    return this.request(`/candidates/${candidateId}/fields/${field}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
  }

  async deleteCandidate(id: string): Promise<void> {
    await this.request(`/candidates/${id}`, {
      method: 'DELETE',
    });
  }

  // Documents API
  /**
   * Upload document - NOW USES UNIFIED SYSTEM
   * This method now uses the new /candidate-documents endpoint with AI verification
   * @deprecated The old /documents endpoint is deprecated. This now uses the unified system.
   */
  async uploadDocument(file: File, candidateId: string, docType: string, isPrimary: boolean = false): Promise<Document> {
    // Use the new unified endpoint instead of old /documents endpoint
    // This ensures all documents go through AI verification. Pass docType so backend can reject wrong-type uploads (e.g. "not a passport").
    const response = await this.uploadCandidateDocument(file, candidateId, 'web', docType);
    
    // Return in old format for backward compatibility
    return {
      id: response.document.id,
      candidate_id: candidateId,
      doc_type: docType,
      storage_bucket: response.document.storage_bucket || 'documents',
      storage_path: response.document.storage_path,
      file_name: response.document.file_name,
      mime_type: response.document.mime_type,
      is_primary: isPrimary,
      created_at: response.document.created_at || new Date().toISOString(),
    };
  }

  /**
   * @deprecated Use getCandidateDocument() instead
   * This now uses the unified system
   */
  async getDocument(id: string): Promise<Document> {
    // Use the new unified endpoint
    const response = await this.getCandidateDocument(id);
    // Convert to old format for backward compatibility
    return {
      id: response.document.id,
      candidate_id: response.document.candidate_id,
      doc_type: response.document.document_type || response.document.category || 'other',
      storage_bucket: response.document.storage_bucket,
      storage_path: response.document.storage_path,
      file_name: response.document.file_name,
      mime_type: response.document.mime_type,
      is_primary: false,
      created_at: response.document.created_at || response.document.received_at,
    };
  }

  /**
   * @deprecated Use listCandidateDocumentsNew() instead
   * This now uses the unified system
   */
  async listCandidateDocuments(candidateId: string): Promise<Document[]> {
    // Use the new unified endpoint
    const docs = await this.listCandidateDocumentsNew(candidateId);
    // Convert to old format for backward compatibility
    return docs.map((doc: any) => ({
      id: doc.id,
      candidate_id: doc.candidate_id,
      doc_type: doc.document_type || doc.category || 'other',
      storage_bucket: doc.storage_bucket,
      storage_path: doc.storage_path,
      file_name: doc.file_name,
      mime_type: doc.mime_type,
      is_primary: false,
      created_at: doc.created_at || doc.received_at,
    }));
  }

  /**
   * @deprecated Use getCandidateDocumentDownload() instead
   * This now uses the unified system
   */
  async getDocumentDownloadUrl(id: string, expiresIn: number = 3600): Promise<string> {
    // Use the new unified endpoint
    const response = await this.getCandidateDocumentDownload(id);
    return response.download_url;
  }

  /**
   * Get download URL for candidate document (unified system)
   */
  async getCandidateDocumentDownloadUrl(id: string, expiresIn: number = 3600): Promise<string> {
    const response = await this.getCandidateDocumentDownload(id);
    return response.download_url;
  }

  /**
   * Generate employer-safe CV for a candidate (new unified server-side system)
   * This replaces the old getCandidateCVDownload method
   * GET /api/cv-generator/:candidateId?format=employer-safe&force=true
   */
  async generateCandidateCV(
    candidateId: string,
    format: 'employer-safe' | 'internal' | 'standard' = 'employer-safe',
    forceRegenerate: boolean = false
  ): Promise<{ cv_url: string; cached: boolean; version_hash: string; file_size?: number }> {
    const params = new URLSearchParams();
    params.set('format', format);
    if (forceRegenerate) {
      params.set('force', 'true');
    }
    return await this.request<{ cv_url: string; cached: boolean; version_hash: string; file_size?: number }>(
      `/cv-generator/${candidateId}?${params.toString()}`
    );
  }

  /**
   * Get CV generation status for a candidate
   * GET /api/cv-generator/:candidateId/status?format=employer-safe
   */
  async getCandidateCVStatus(
    candidateId: string,
    format: 'employer-safe' | 'internal' | 'standard' = 'employer-safe'
  ): Promise<{
    exists: boolean;
    cached: boolean;
    version_hash?: string;
    generated_at?: string;
    file_size?: number;
    access_count?: number;
  }> {
    const params = new URLSearchParams();
    params.set('format', format);
    return await this.request<{
      exists: boolean;
      cached: boolean;
      version_hash?: string;
      generated_at?: string;
      file_size?: number;
      access_count?: number;
    }>(`/cv-generator/${candidateId}/status?${params.toString()}`);
  }

  /**
   * Generate CVs for multiple candidates (bulk operation)
   * POST /api/cv-generator/bulk
   */
  async generateBulkCVs(
    candidateIds: string[],
    format: 'employer-safe' | 'internal' | 'standard' = 'employer-safe',
    template?: string
  ): Promise<{
    results: Array<{
      candidate_id: string;
      candidate_name: string;
      success: boolean;
      cv_url?: string;
      error?: string;
    }>;
    summary: {
      total: number;
      success: number;
      failed: number;
    };
  }> {
    return await this.request<{
      results: Array<{
        candidate_id: string;
        candidate_name: string;
        success: boolean;
        cv_url?: string;
        error?: string;
      }>;
      summary: {
        total: number;
        success: number;
        failed: number;
      };
    }>(`/cv-generator/bulk`, {
      method: 'POST',
      body: JSON.stringify({
        candidate_ids: candidateIds,
        format,
        template,
      }),
    });
  }

  async linkCandidateCV(candidateId: string): Promise<{ document: any; message: string }> {
    return await this.request<{ document: any; message: string }>(`/candidates/${candidateId}/link-cv`, {
      method: 'POST',
    });
  }

  async uploadCandidatePhoto(candidateId: string, file: File): Promise<{ message: string; photo_url: string; photo_path: string }> {
    const formData = new FormData();
    formData.append('photo', file);

    const url = `${API_BASE_URL}/candidates/${candidateId}/photo`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - browser sets it with boundary
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  /**
   * @deprecated Use deleteCandidateDocument() instead
   * This now uses the unified system
   */
  async deleteDocument(id: string): Promise<void> {
    // Use the new unified endpoint
    await this.deleteCandidateDocument(id);
  }

  // Candidate Documents API (AI Verification System)
  async uploadCandidateDocument(file: File, candidateId: string, source: string = 'web', documentType?: string): Promise<{ document: any; request_id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('candidate_id', candidateId);
    formData.append('source', source);
    if (documentType) formData.append('document_type', documentType);

    // Calculate timeout based on file size (120 seconds for files up to 10MB, longer for larger files)
    // Base timeout: 120 seconds, add 10 seconds per MB
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(120000, 120000 + (fileSizeMB * 10000)); // Min 120s, +10s per MB

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const url = `${API_BASE_URL}/documents/candidate-documents`;
      
      // Create a promise that rejects on timeout
      const uploadPromise = fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Don't set Content-Type header - browser will set it with boundary
      });

      const response = await uploadPromise;
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text().catch(() => '');
        throw new Error(`API Error: ${response.status} ${error}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        throw new Error(`Upload timeout: The file (${fileSizeMB.toFixed(2)}MB) took too long to upload. Please check your connection and try again.`);
      }
      // Re-throw network errors with better messages
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error(`Network error: Unable to connect to server. Please check your internet connection and try again.`);
      }
      throw error;
    }
  }

  async getCandidateDocument(id: string): Promise<{ document: any }> {
    const response = await this.request<{ document: any }>(`/documents/candidate-documents/${id}`);
    return response;
  }

  async updateCandidateDocument(id: string, data: { verification_status?: string; verification_reason_code?: string }): Promise<{ document: any }> {
    const response = await this.request<{ document: any }>(`/documents/candidate-documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  }

  async getCandidateDocumentDownload(id: string): Promise<{ download_url: string }> {
    const response = await this.request<{ download_url: string }>(`/documents/candidate-documents/${id}/download`);
    return response;
  }

  async deleteCandidateDocument(id: string): Promise<void> {
    await this.request(`/documents/candidate-documents/${id}`, {
      method: 'DELETE',
    });
  }

  async reprocessCandidateDocument(id: string): Promise<{ success: boolean; request_id: string; message: string }> {
    const response = await this.request<{ success: boolean; request_id: string; message: string }>(
      `/documents/candidate-documents/${id}/reprocess`,
      {
        method: 'POST',
      }
    );
    return response;
  }

  async quickApproveCandidateDocument(id: string): Promise<{ success: boolean; document: any; message: string }> {
    const response = await this.request<{ success: boolean; document: any; message: string }>(
      `/documents/candidate-documents/${id}/approve`,
      {
        method: 'POST',
      }
    );
    return response;
  }

  async overrideCandidateDocument(
    documentId: string,
    adminEmail: string,
    adminPassword: string,
    justification: string
  ): Promise<{ document: any }> {
    const response = await this.request<{ document: any }>(
      `/documents/candidate-documents/${documentId}/override`,
      {
        method: 'POST',
        body: JSON.stringify({
          admin_email: adminEmail,
          admin_password: adminPassword,
          justification: justification,
        }),
      }
    );
    return response;
  }

  async listCandidateDocumentsNew(candidateId: string): Promise<any[]> {
    const response = await this.request<{ documents: any[] }>(`/documents/candidates/${candidateId}/documents`);
    return response.documents || [];
  }

  // Verification Logs API
  async getVerificationLogsByDocument(documentId: string): Promise<{ logs: any[] }> {
    const response = await this.request<{ logs: any[] }>(`/verification-logs/document/${documentId}`);
    return response;
  }

  async getVerificationLogsByCandidate(candidateId: string): Promise<{ logs: any[] }> {
    const response = await this.request<{ logs: any[] }>(`/verification-logs/candidate/${candidateId}`);
    return response;
  }

  async getVerificationTimeline(params: { candidateId?: string; documentId?: string; limit?: number }): Promise<{ logs: any[] }> {
    const queryParams = new URLSearchParams();
    if (params.candidateId) queryParams.append('candidateId', params.candidateId);
    if (params.documentId) queryParams.append('documentId', params.documentId);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    
    const response = await this.request<{ logs: any[] }>(`/verification-logs/timeline?${queryParams.toString()}`);
    return response;
  }

  // Timeline API
  async getCandidateTimeline(candidateId: string, filters: TimelineFilters = {}): Promise<TimelineResponse> {
    const params = new URLSearchParams();
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.category) params.append('category', filters.category);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const query = params.toString();
    return this.request<TimelineResponse>(`/timeline/candidate/${candidateId}${query ? `?${query}` : ''}`);
  }

  async getTimelineEvent(id: string): Promise<TimelineEvent> {
    const response = await this.request<{ event: TimelineEvent }>(`/timeline/${id}`);
    return response.event;
  }

  async createTimelineEvent(data: {
    candidate_id: string;
    event_category: string;
    event_type: string;
    actor_user_id?: string;
    metadata?: Record<string, any>;
  }): Promise<TimelineEvent> {
    const response = await this.request<{ event: TimelineEvent }>('/timeline', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.event;
  }

  // Employers API
  async getEmployers(filters: EmployerFilters = {}): Promise<EmployersResponse> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return this.request<EmployersResponse>(`/employers${query ? `?${query}` : ''}`);
  }

  async getEmployer(id: string): Promise<Employer> {
    const response = await this.request<{ employer: Employer }>(`/employers/${id}`);
    return response.employer;
  }

  async createEmployer(data: CreateEmployerData): Promise<Employer> {
    const response = await this.request<{ employer: Employer }>('/employers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.employer;
  }

  async updateEmployer(id: string, data: Partial<CreateEmployerData>): Promise<Employer> {
    const response = await this.request<{ employer: Employer }>(`/employers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.employer;
  }

  async deleteEmployer(id: string): Promise<void> {
    await this.request(`/employers/${id}`, {
      method: 'DELETE',
    });
  }

  // Job Orders API
  async generateJobCode(): Promise<string> {
    const response = await this.request<{ jobCode: string }>('/job-orders/generate-code');
    return response.jobCode;
  }

  async getJobOrders(filters: JobOrderFilters = {}, includeEmployer: boolean = false): Promise<JobOrdersResponse> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.employer_id) params.append('employer_id', filters.employer_id);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (includeEmployer) params.append('includeEmployer', 'true');

    const query = params.toString();
    return this.request<JobOrdersResponse>(`/job-orders${query ? `?${query}` : ''}`);
  }

  async getJobOrder(id: string, includeEmployer: boolean = false): Promise<JobOrder | JobOrderWithEmployer> {
    const params = includeEmployer ? '?includeEmployer=true' : '';
    const response = await this.request<{ jobOrder: JobOrder | JobOrderWithEmployer }>(`/job-orders/${id}${params}`);
    return response.jobOrder;
  }

  async createJobOrder(data: CreateJobOrderData): Promise<JobOrder> {
    const response = await this.request<{ jobOrder: JobOrder }>('/job-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.jobOrder;
  }

  async updateJobOrder(id: string, data: Partial<CreateJobOrderData>): Promise<JobOrder> {
    const response = await this.request<{ jobOrder: JobOrder }>(`/job-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.jobOrder;
  }

  async deleteJobOrder(id: string): Promise<void> {
    await this.request(`/job-orders/${id}`, {
      method: 'DELETE',
    });
  }

  // CV Extraction API
  async extractCandidateData(id: string, cvUrl: string): Promise<any> {
    // Add timeout to extraction request (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const result = await this.request(`/candidates/${id}/extract`, {
        method: 'POST',
        body: JSON.stringify({ cvUrl }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Extraction timeout: The process took too long. Please try again.');
      }
      throw error;
    }
  }

  async updateExtraction(id: string, extractedData: any, approved: boolean, notes?: string): Promise<any> {
    return this.request(`/candidates/${id}/extraction`, {
      method: 'PUT',
      body: JSON.stringify({ extractedData, approved, notes }),
    });
  }

  async approveExtraction(id: string, extractedData: any, notes?: string): Promise<any> {
    return this.updateExtraction(id, extractedData, true, notes);
  }

  async getExtractionHistory(id: string): Promise<{ history: any[] }> {
    return this.request(`/candidates/${id}/extraction-history`);
  }
}

export const apiClient = new ApiClient();