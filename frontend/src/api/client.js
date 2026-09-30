const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api/v1`;

const TOKEN_KEY = 'formbuilder_auth_token';
const USER_KEY = 'formbuilder_auth_user';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore storage errors
  }
}

function authHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data.detail) {
        if (typeof data.detail === 'string') {
          errorDetail = data.detail;
        } else if (data.detail.message) {
          errorDetail = data.detail.message;
        } else {
          errorDetail = JSON.stringify(data.detail);
        }
      }
    } catch {
      // Ignored if not JSON
    }
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const api = {
  // Token & user session storage
  getToken,
  setToken,
  getUser,
  setUser,
  clearAuth,

  // Health checks
  async checkHealth() {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      return await res.json();
    } catch {
      return { status: 'offline' };
    }
  },

  async checkDbHealth() {
    try {
      const res = await fetch(`${BASE_URL}/health/db`);
      return await res.json();
    } catch {
      return { status: 'disconnected', database: 'unknown' };
    }
  },

  // Authentication endpoints
  async register(email, password, fullName = '') {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    const data = await handleResponse(res);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  },

  async getMe() {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        clearAuth();
        return null;
      }
      const user = await handleResponse(res);
      setUser(user);
      return user;
    } catch {
      return null;
    }
  },

  logout() {
    clearAuth();
  },

  // Form endpoints
  async getForms(search = '', status = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_URL}/forms${queryStr}`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async getForm(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async createForm(formData) {
    const res = await fetch(`${API_URL}/forms`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(formData),
    });
    return handleResponse(res);
  },

  async updateForm(formId, formData) {
    const res = await fetch(`${API_URL}/forms/${formId}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(formData),
    });
    return handleResponse(res);
  },

  async deleteForm(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async duplicateForm(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}/duplicate`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async togglePublish(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}/toggle-publish`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async createFromTemplate(templateKey) {
    const res = await fetch(`${API_URL}/forms/templates/${templateKey}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  // Field endpoints
  async addField(formId, fieldData) {
    const res = await fetch(`${API_URL}/forms/${formId}/fields`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(fieldData),
    });
    return handleResponse(res);
  },

  async updateField(formId, fieldId, fieldData) {
    const res = await fetch(`${API_URL}/forms/${formId}/fields/${fieldId}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(fieldData),
    });
    return handleResponse(res);
  },

  async deleteField(formId, fieldId) {
    const res = await fetch(`${API_URL}/forms/${formId}/fields/${fieldId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async reorderFields(formId, fields) {
    const payload = {
      fields: fields.map((f, idx) => ({ id: f.id, order: idx })),
    };
    const res = await fetch(`${API_URL}/forms/${formId}/fields-order`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Public respondent endpoints (NO AUTH REQUIRED)
  async getPublicForm(formId) {
    const res = await fetch(`${API_URL}/public/forms/${formId}`);
    return handleResponse(res);
  },

  async submitPublicForm(formId, answers) {
    const res = await fetch(`${API_URL}/public/forms/${formId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    return handleResponse(res);
  },

  // Responses & Analytics
  async getFormResponses(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}/responses`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async getFormAnalytics(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}/analytics`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  getExportCsvUrl(formId) {
    const token = getToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_URL}/forms/${formId}/export${query}`;
  },
};
