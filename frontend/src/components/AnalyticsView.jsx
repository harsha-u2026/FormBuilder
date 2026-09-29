import React, { useState, useEffect } from 'react';
import {
  Download,
  Table,
  BarChart3,
  Calendar,
  Clock,
  ArrowLeft,
  Users,
  Search,
  Star,
  CheckCircle2,
  FileSpreadsheet,
  Edit3,
} from 'lucide-react';
import { api } from '../api/client';

export default function AnalyticsView({ form, onBack, onOpenBuilder }) {
  const [activeTab, setActiveTab] = useState('table');
  const [responses, setResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState('');

  useEffect(() => {
    if (!form) return;
    loadData();
  }, [form.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [respData, analyticsData] = await Promise.all([
        api.getFormResponses(form.id),
        api.getFormAnalytics(form.id),
      ]);
      setResponses(respData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load responses or analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(form.id), '_blank');
  };

  if (!form) return null;

  const fields = form.fields || [];

  // Filter table rows based on search
  const filteredResponses = responses.filter((resp) => {
    if (!tableSearch) return true;
    const query = tableSearch.toLowerCase();
    const matchesId = String(resp.id).includes(query);
    const matchesDate = resp.submitted_at && resp.submitted_at.toLowerCase().includes(query);
    const matchesAnswers = Object.values(resp.answers || {}).some((v) =>
      String(v).toLowerCase().includes(query)
    );
    return matchesId || matchesDate || matchesAnswers;
  });

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          {onBack && (
            <button className="btn btn-secondary btn-icon" onClick={onBack} title="Back to Dashboard">
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Responses & Analytics</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Form: <strong style={{ color: 'var(--text-main)' }}>{form.title}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {onOpenBuilder && (
            <button className="btn btn-secondary" onClick={onOpenBuilder} title="Edit form questions in Builder">
              <Edit3 size={16} />
              <span>Form Builder</span>
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleExportCsv}
            disabled={responses.length === 0}
            title="Download responses as CSV"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="metric-val">{responses.length}</div>
            <div className="metric-label">Total Submissions</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div className="metric-val" style={{ fontSize: '1.25rem' }}>
              {responses.length > 0
                ? new Date(responses[0].submitted_at).toLocaleDateString()
                : 'None yet'}
            </div>
            <div className="metric-label">Latest Response</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <div className="metric-val">{fields.length}</div>
            <div className="metric-label">Form Fields</div>
          </div>
        </div>
      </div>

      {/* Sub-view switcher */}
      <div className="analytics-tabs">
        <button
          className={`analytics-tab ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          <Table size={16} />
          <span>Responses Table ({responses.length})</span>
        </button>
        <button
          className={`analytics-tab ${activeTab === 'charts' ? 'active' : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          <BarChart3 size={16} />
          <span>Visual Summaries</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          Loading submissions...
        </div>
      ) : responses.length === 0 ? (
        <div className="canvas-sheet" style={{ margin: '1rem auto', textAlign: 'center', padding: '4rem 2rem' }}>
          <Users size={48} color="var(--text-faint)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No responses received yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto' }}>
            Make sure your form is published and share the public link with respondents to collect answers.
          </p>
        </div>
      ) : activeTab === 'table' ? (
        /* Table View */
        <div>
          <div style={{ marginBottom: '1rem', maxWidth: 380 }}>
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search response answers..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Submitted At</th>
                  {fields.map((f) => (
                    <th key={f.id}>{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{r.id}</td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(r.submitted_at).toLocaleString()}
                    </td>
                    {fields.map((f) => {
                      const val = r.answers[String(f.id)];
                      let displayVal = val;
                      if (val === undefined || val === null || val === '') {
                        displayVal = <span style={{ color: 'var(--text-faint)' }}>—</span>;
                      } else if (Array.isArray(val)) {
                        displayVal = val.join(', ');
                      } else if (typeof val === 'boolean') {
                        displayVal = val ? 'Yes' : 'No';
                      } else if (f.field_type === 'rating') {
                        displayVal = `${val} / 5 ★`;
                      }

                      return <td key={f.id}>{displayVal}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visual Charts View */
        <div className="charts-grid">
          {(analytics?.fields_summary || []).map((summary) => (
            <div key={summary.field_id} className="chart-card">
              <h3 className="chart-title">{summary.label}</h3>
              <div className="chart-subtitle">
                Type: {summary.field_type} • {summary.total_answers} answers
              </div>

              {/* Multiple Choice breakdown */}
              {summary.option_counts && Object.keys(summary.option_counts).length > 0 && (
                <div>
                  {Object.entries(summary.option_counts).map(([opt, count]) => {
                    const pct =
                      summary.total_answers > 0
                        ? Math.round((count / summary.total_answers) * 100)
                        : 0;

                    return (
                      <div key={opt} className="stat-bar-row">
                        <div className="stat-bar-header">
                          <span style={{ fontWeight: 600 }}>{opt}</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="stat-bar-bg">
                          <div className="stat-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rating breakdown */}
              {summary.average_rating !== null && summary.average_rating !== undefined && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>
                    {summary.average_rating}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', margin: '0.5rem 0' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={20}
                        color="#fbbf24"
                        fill={summary.average_rating >= s ? '#fbbf24' : 'transparent'}
                      />
                    ))}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Average Score across {summary.total_answers} ratings
                  </div>
                </div>
              )}

              {/* Recent Text responses */}
              {summary.recent_answers && summary.recent_answers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
                  {summary.recent_answers.map((ans, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.6rem 0.85rem',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        borderLeft: '3px solid var(--primary)',
                      }}
                    >
                      "{ans}"
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
