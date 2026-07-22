'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/utils/api';
import { MessageSquare, Send, Edit3, Trash2, X } from 'lucide-react';

type DiscussionComment = {
  id: number;
  submission: number;
  sender_role: 'reviewer' | 'author';
  message: string;
  is_own: boolean;
  created_at: string;
  updated_at: string;
};

interface ManuscriptDiscussionProps {
  submissionId: number;
  title?: string;
}

export default function ManuscriptDiscussion({ submissionId, title }: ManuscriptDiscussionProps) {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }, []);

  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState('');

  const fetchComments = async () => {
    if (!token || !submissionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`manuscript-comments/?submission=${submissionId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `Failed (${res.status})`);
      }
      setComments(Array.isArray(data) ? data : data?.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load discussion');
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, token]);

  const handleSend = async () => {
    if (!token) return;
    const trimmed = message.trim();
    if (!trimmed) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch(apiUrl('manuscript-comments/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission: submissionId,
          message: trimmed,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `Failed (${res.status})`);
      }
      setMessage('');
      await fetchComments();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startEdit = (c: DiscussionComment) => {
    setEditingId(c.id);
    setEditingMessage(c.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingMessage('');
  };

  const saveEdit = async () => {
    if (!token || !editingId) return;
    const trimmed = editingMessage.trim();
    if (!trimmed) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`manuscript-comments/${editingId}/`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `Failed (${res.status})`);
      }
      cancelEdit();
      await fetchComments();
    } catch (err: any) {
      setError(err.message || 'Failed to update comment');
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (id: number) => {
    if (!token) return;
    if (!confirm('Delete this comment?')) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`manuscript-comments/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.error || `Failed (${res.status})`);
      }
      await fetchComments();
    } catch (err: any) {
      setError(err.message || 'Failed to delete comment');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border shadow-sm p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <MessageSquare className="text-blue-600" size={22} />
        <h3 className="text-xl font-semibold text-gray-900">
          {title || 'Reviewer-Author Discussion'}
        </h3>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading discussion...</p>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No comments yet. Start the discussion.
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-xl border ${
                c.sender_role === 'reviewer'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                  {c.sender_role}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>

              {editingId === c.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editingMessage}
                    onChange={(e) => setEditingMessage(e.target.value)}
                    rows={3}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={sending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm flex items-center gap-1"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-800 whitespace-pre-wrap">{c.message}</p>
              )}

              {c.is_own && editingId !== c.id && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-blue-700 text-sm inline-flex items-center gap-1 hover:underline"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="text-red-700 text-sm inline-flex items-center gap-1 hover:underline"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-5 space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Write your message..."
        />
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}

