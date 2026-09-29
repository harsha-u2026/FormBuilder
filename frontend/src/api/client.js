const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api/v1`;

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
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
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

  // Form endpoints
  async getForms(search = '', status = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_URL}/forms${queryStr}`);
    return handleResponse(res);
  },

  async getForm(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}`);
    return handleResponse(res);
  },

  async createForm(formData) {
    const res = await fetch(`${API_URL}/forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    return handleResponse(res);
  },

  async updateForm(formId, formData) {
    const res = await fetch(`${API_URL}/forms/${formId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    return handleResponse(res);
  },

  async deleteForm(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async duplicateForm(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}/duplicate`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async togglePublish(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}/toggle-publish`, {
      method: 'PATCH',
    });
    return handleResponse(res);
  },

  async createFromTemplate(templateKey) {
    const res = await fetch(`${API_URL}/forms/templates/${templateKey}`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  // Field endpoints
  async addField(formId, fieldData) {
    const res = await fetch(`${API_URL}/forms/${formId}/fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fieldData),
    });
    return handleResponse(res);
  },

  async updateField(formId, fieldId, fieldData) {
    const res = await fetch(`${API_URL}/forms/${formId}/fields/${fieldId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fieldData),
    });
    return handleResponse(res);
  },

  async deleteField(formId, fieldId) {
    const res = await fetch(`${API_URL}/forms/${formId}/fields/${fieldId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async reorderFields(formId, fields) {
    const payload = {
      fields: fields.map((f, idx) => ({ id: f.id, order: idx })),
    };
    const res = await fetch(`${API_URL}/forms/${formId}/fields-order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Public respondent endpoints
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
    const res = await fetch(`${API_URL}/forms/${formId}/responses`);
    return handleResponse(res);
  },

  async getFormAnalytics(formId) {
    const res = await fetch(`${API_URL}/forms/${formId}/analytics`);
    return handleResponse(res);
  },

  getExportCsvUrl(formId) {
    return `${API_URL}/forms/${formId}/export`;
  },
};
