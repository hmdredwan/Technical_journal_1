'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';

interface AnalyticsData {
  total_pageviews: number;
  total_sessions: number;
  total_users: number;
  avg_session_duration: number;
  geographic_readership: Array<{ country: string; views: number }>;
  most_viewed_papers: Array<{ title: string; views: number }>;
  most_downloaded_pdfs: Array<{ title: string; downloads: number }>;
  views_over_time: Array<{ date: string; views: number }>;
}

const formatNumber = (value: number) => value.toLocaleString();

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

const parseAnalyticsDate = (date: string) => {
  if (/^\d{8}$/.test(date)) {
    return new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`);
  }
  return new Date(date);
};

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysRange, setDaysRange] = useState(7);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Admin authorization is required to view analytics.');
        }

        const response = await fetch(apiUrl('admin/analytics/'), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to fetch analytics data');
        }

        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        <span className="ml-3 text-slate-600">Loading analytics data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-red-50 p-6 border border-red-200">
        <h4 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h4>
        <p className="text-red-700">{error}</p>
        <p className="text-sm text-red-600 mt-2">
          Please check your Google Analytics configuration or try again later.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl bg-yellow-50 p-6 border border-yellow-200">
        <h4 className="text-lg font-semibold text-yellow-900 mb-2">No Data Available</h4>
        <p className="text-yellow-700">Analytics data is not available at this time.</p>
      </div>
    );
  }

  const sortedViewsOverTime = [...data.views_over_time].sort((a, b) => {
    const aDate = parseAnalyticsDate(a.date).getTime();
    const bDate = parseAnalyticsDate(b.date).getTime();
    return aDate - bDate;
  });

  const filteredViewsOverTime = sortedViewsOverTime.slice(-daysRange);

  // Calculate max value for the views over time chart
  const maxBar = filteredViewsOverTime.length > 0 ? Math.max(...filteredViewsOverTime.map(point => point.views)) : 1;

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Analytics Overview</h3>
        <p className="text-sm text-gray-500 max-w-2xl">
          Review reader engagement, downloads, and traffic patterns for the journal website. Data is collected through Google Analytics and aggregated here for admin review.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl ring-1 ring-slate-200/10">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Pageviews</p>
          <h4 className="mt-4 text-4xl font-semibold">{formatNumber(data.total_pageviews)}</h4>
          <p className="mt-3 text-sm text-slate-300">Total site pageviews over the last 30 days.</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl ring-1 ring-slate-200">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Average Reading Time</p>
          <h4 className="mt-4 text-4xl font-semibold text-slate-900">{formatDuration(data.avg_session_duration)}</h4>
          <p className="mt-3 text-sm text-slate-600">Average session duration per article.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl ring-1 ring-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Views Over Time</p>
              <h4 className="mt-2 text-2xl font-semibold text-slate-900">Daily Traffic Trend</h4>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <span>{`Last ${daysRange} days`}</span>
              <select
                value={daysRange}
                onChange={e => setDaysRange(Number(e.target.value))}
                className="bg-transparent text-slate-900 text-xs font-semibold outline-none"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredViewsOverTime.map((point) => {
              const parsedDate = parseAnalyticsDate(point.date);
              const label = Number.isNaN(parsedDate.getTime())
                ? point.date
                : parsedDate.toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div key={point.date} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{label}</span>
                    <span>{formatNumber(point.views)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                      style={{ width: `${maxBar > 0 ? (point.views / maxBar) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl ring-1 ring-slate-200">
          <h4 className="text-xl font-semibold text-slate-900 mb-4">Average Engagement</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total Sessions</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(data.total_sessions)}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total Users</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(data.total_users)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl ring-1 ring-slate-200">
          <h4 className="text-xl font-semibold text-slate-900 mb-4">Geographic Readership</h4>
          <div className="space-y-4">
            {data.geographic_readership.slice(0, 5).map((item) => (
              <div key={item.country} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-900">{item.country}</span>
                  <span className="text-sm text-slate-500">{formatNumber(item.views)} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl ring-1 ring-slate-200">
          <h4 className="text-xl font-semibold text-slate-900 mb-4">Most Viewed Papers</h4>
          <div className="space-y-3">
            {data.most_viewed_papers.map((paper) => (
              <div key={paper.title} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-900">{paper.title}</span>
                  <span className="text-sm text-slate-500">{formatNumber(paper.views)} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl ring-1 ring-slate-200">
          <h4 className="text-xl font-semibold text-slate-900 mb-4">PDF Downloads</h4>
          <div className="space-y-3">
            {data.most_downloaded_pdfs.map((paper) => (
              <div key={paper.title} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-900">{paper.title}</span>
                  <span className="text-sm text-slate-500">{formatNumber(paper.downloads)} downloads</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-950 text-white p-6 shadow-xl ring-1 ring-slate-800">
        <h4 className="text-xl font-semibold">Analytics Notes</h4>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Data shown here is fetched from Google Analytics in real-time. For full Google Analytics details, sign in to the Google Analytics console.
        </p>
      </div>
    </div>
  );
}
