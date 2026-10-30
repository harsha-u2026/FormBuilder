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
  FileText,
  TrendingUp,
  Eye,
  Filter,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../api/client';

export default function AnalyticsView({ form, onBack, onOpenBuilder }) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'table' | 'trends'
  const [responses, setResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState('');

  // Date range filters
  const [datePreset, setDatePreset] = useState('all'); // 'all' | '7d' | '30d' | 'custom'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    if (!form) return;
    loadData();
  }, [form.id, datePreset, customFrom, customTo]);

  const getDateRangeParams = () => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (datePreset === '7d') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      return { from: formatDate(past7), to: formatDate(today) };
    }
    if (datePreset === '30d') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      return { from: formatDate(past30), to: formatDate(today) };
    }
    if (datePreset === 'custom' && customFrom) {
      return { from: customFrom, to: customTo || formatDate(today) };
    }
    return { from: null, to: null };
  };

  const loadData = async () => {
    setLoading(true);
    const { from, to } = getDateRangeParams();
    try {
      const [respData, analyticsData] = await Promise.all([
        api.getFormResponses(form.id),
        api.getFormAnalytics(form.id, from, to),
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

  const handleExportXlsx = () => {
    window.open(api.getExportXlsxUrl(form.id), '_blank');
  };

  if (!form) return null;

  const fields = form.fields || [];

  // Filter table rows based on search and date filter
  const { from: filterFrom, to: filterTo } = getDateRangeParams();
  const filteredResponses = responses.filter((resp) => {
    // Date filter
    if (filterFrom && resp.submitted_at) {
      const subDate = resp.submitted_at.split('T')[0];
      if (subDate < filterFrom) return false;
      if (filterTo && subDate > filterTo) return false;
    }

    // Search query
    if (!tableSearch) return true;
    const query = tableSearch.toLowerCase();
    const matchesId = String(resp.id).includes(query);
    const matchesDate = resp.submitted_at && resp.submitted_at.toLowerCase().includes(query);
    const matchesAnswers = Object.values(resp.answers || {}).some((v) =>
      String(v).toLowerCase().includes(query)
    );
    return matchesId || matchesDate || matchesAnswers;
  });

  const dailyTrends = analytics?.daily_trends || [];
  const maxTrendCount = dailyTrends.length > 0 ? Math.max(...dailyTrends.map((t) => t.count), 1) : 1;

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
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Responses & Advanced Analytics</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Form: <strong style={{ color: 'var(--text-main)' }}>{form.title}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
          <button
            className="btn btn-primary"
            onClick={handleExportXlsx}
            disabled={responses.length === 0}
            title="Download responses as Excel (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div
        className="analytics-filter-bar"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Filter size={16} color="var(--color-primary)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Date Range:</span>
          <select
            className="form-select"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            style={{ width: 'auto', padding: '0.35rem 1.75rem 0.35rem 0.75rem', fontSize: '0.85rem' }}
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Date Range...</option>
          </select>

          {datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="date"
                className="form-input"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                className="form-input"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={loadData}
          disabled={loading}
          title="Refresh analytics data"
        >
          <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Metrics Row */}
      <div className="metrics-grid" style={{ marginBottom: '1.75rem' }}>
        {/* Total Submissions */}
        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="metric-val">{analytics?.total_responses ?? responses.length}</div>
            <div className="metric-label">Total Submissions</div>
          </div>
        </div>

        {/* Total Views */}
        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
            <Eye size={24} />
          </div>
          <div>
            <div className="metric-val">{analytics?.view_count ?? form.view_count ?? 0}</div>
            <div className="metric-label">Form Page Views</div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="metric-val">
              {analytics?.completion_rate !== null && analytics?.completion_rate !== undefined
                ? `${analytics.completion_rate}%`
                : '100%'}
            </div>
            <div className="metric-label">
              {analytics?.view_count > 0 ? 'Completion Rate' : 'Estimated Completion'}
            </div>
          </div>
        </div>

        {/* Latest Response */}
        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="metric-val" style={{ fontSize: '1.15rem' }}>
              {analytics?.latest_response_at
                ? new Date(analytics.latest_response_at).toLocaleDateString()
                : responses.length > 0
                ? new Date(responses[0].submitted_at).toLocaleDateString()
                : 'No submissions'}
            </div>
            <div className="metric-label">Latest Response</div>
          </div>
        </div>
      </div>

      {/* Daily Trends Visualization */}
      {dailyTrends.length > 0 && (
        <div
          className="analytics-trend-card"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Submissions Over Time</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Daily submission volume across recorded responses
              </p>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--color-primary)',
                fontWeight: 600,
              }}
            >
              {dailyTrends.length} Active {dailyTrends.length === 1 ? 'Day' : 'Days'}
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div
            className="trend-chart-bars"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.75rem',
              height: 140,
              paddingTop: '1rem',
              borderBottom: '1px solid var(--color-border)',
              overflowX: 'auto',
            }}
          >
            {dailyTrends.map((pt) => {
              const heightPct = Math.max(12, Math.round((pt.count / maxTrendCount) * 100));
              return (
                <div
                  key={pt.date}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 46,
                    flex: 1,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                  title={`${pt.date}: ${pt.count} submissions`}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
                    {pt.count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 32,
                      height: `${heightPct}%`,
                      background: 'linear-gradient(180deg, var(--color-primary), #a855f7)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease',
                    }}
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem', whiteSpace: 'nowrap' }}>
                    {pt.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-view switcher tabs */}
      <div className="analytics-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`analytics-tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <BarChart3 size={16} />
          <span>Question Breakdowns ({fields.length})</span>
        </button>
        <button
          className={`analytics-tab ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          <Table size={16} />
          <span>Submissions Data ({filteredResponses.length})</span>
        </button>
      </div>

      {activeTab === 'summary' ? (
        /* Visual Question Breakdowns */
        analytics?.fields_summary && analytics.fields_summary.length > 0 ? (
          <div className="charts-grid">
            {analytics.fields_summary.map((summary) => (
              <div key={summary.field_id} className="chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 className="chart-title" style={{ fontSize: '1.05rem', margin: 0 }}>
                    {summary.label}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-surface-hover)',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {summary.field_type}
                  </span>
                </div>

                <div className="chart-subtitle" style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {summary.total_answers} answers • {summary.answer_rate ?? 100}% response rate
                </div>

                {/* Multiple Choice breakdown (radio, select, checkbox, switch) */}
                {summary.option_counts && Object.keys(summary.option_counts).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {Object.entries(summary.option_counts).map(([opt, count]) => {
                      const pct = summary.option_percentages?.[opt] ?? (
                        summary.total_answers > 0
                          ? Math.round((count / summary.total_answers) * 100)
                          : 0
                      );

                      return (
                        <div key={opt} className="stat-bar-row">
                          <div className="stat-bar-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 600 }}>{opt}</span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="stat-bar-bg" style={{ height: 8, background: 'var(--color-surface-hover)', borderRadius: 999, overflow: 'hidden' }}>
                            <div
                              className="stat-bar-fill"
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: form.theme_color || 'var(--color-primary)',
                                borderRadius: 999,
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Star Rating breakdown with histogram */}
                {summary.average_rating !== null && summary.average_rating !== undefined && (
                  <div style={{ padding: '0.5rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.75rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>
                          {summary.average_rating}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.2rem', margin: '0.4rem 0' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={16}
                              color="#fbbf24"
                              fill={summary.average_rating >= s ? '#fbbf24' : 'transparent'}
                            />
                          ))}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          Out of 5 Stars
                        </div>
                      </div>

                      {/* 5-to-1 Star Histogram */}
                      {summary.rating_breakdown && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = summary.rating_breakdown[String(star)] || 0;
                            const pct = summary.total_answers > 0 ? Math.round((count / summary.total_answers) * 100) : 0;
                            return (
                              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                                <span style={{ width: 22, color: 'var(--text-muted)' }}>{star}★</span>
                                <div style={{ flex: 1, height: 6, background: 'var(--color-surface-hover)', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: '#fbbf24', borderRadius: 4 }} />
                                </div>
                                <span style={{ width: 28, textAlign: 'right', color: 'var(--text-muted)' }}>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent Text / File answers list */}
                {summary.recent_answers && summary.recent_answers.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 200, overflowY: 'auto' }}>
                    {summary.recent_answers.map((ans, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--color-surface-hover)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.825rem',
                          borderLeft: '3px solid var(--color-primary)',
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
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ fontWeight: 600 }}>No response data available for question breakdown yet.</p>
          </div>
        )
      ) : (
        /* Submissions Data Table */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ position: 'relative', width: 280 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search responses..."
                className="form-input"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
              />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredResponses.length} of {responses.length} submissions
            </span>
          </div>

          <div className="table-responsive">
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
                {filteredResponses.length === 0 ? (
                  <tr>
                    <td colSpan={fields.length + 2} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No submissions found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredResponses.map((resp, idx) => (
                    <tr key={resp.id}>
                      <td style={{ fontWeight: 600 }}>#{resp.id}</td>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(resp.submitted_at).toLocaleString()}
                      </td>
                      {fields.map((f) => {
                        const val = resp.answers[String(f.id)];
                        let displayVal = val ?? <span style={{ color: 'var(--text-faint)' }}>—</span>;

                        if (f.field_type === 'file') {
                          if (Array.isArray(val) && val.length > 0) {
                            displayVal = (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                {val.map((file, fIdx) => (
                                  <a
                                    key={fIdx}
                                    href={file.download_url || api.getFileDownloadUrl(form.id, file.file_key)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.8rem',
                                      color: 'var(--color-primary)',
                                    }}
                                  >
                                    <FileText size={12} />
                                    <span>{file.original_filename || file.name || 'File'}</span>
                                  </a>
                                ))}
                              </div>
                            );
                          } else {
                            displayVal = <span style={{ color: 'var(--text-faint)' }}>—</span>;
                          }
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
