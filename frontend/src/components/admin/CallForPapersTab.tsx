// src/components/admin/CallForPapersTab.tsx
'use client';

import { useState } from 'react';
import { Send, Plus, Trash2 } from 'lucide-react';
import { apiUrl } from '@/utils/api';

export default function CallForPapersTab() {
  const [emails, setEmails] = useState<string[]>([]);
  const [inputEmail, setInputEmail] = useState('');
  const [subject, setSubject] = useState('Call for Papers');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleAddEmail = () => {
    if (inputEmail && !emails.includes(inputEmail)) {
      setEmails([...emails, inputEmail]);
      setInputEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const handleSend = async () => {
    setSending(true);
    setSuccess('');
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      emails.forEach(email => formData.append('emails', email));
      formData.append('subject', subject);
      formData.append('message', message);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const res = await fetch(apiUrl('admin/call-for-papers/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const result = await res.json().catch(() => null);

      if (!res.ok) {
        const text = result?.detail || result?.error || (await res.text());
        throw new Error(text || 'Request failed');
      }

      // If backend returns sent count, ensure at least one email was delivered.
      if (result && typeof result.sent === 'number') {
        if (result.sent > 0) {
          setSuccess(`Call for papers email sent successfully to ${result.sent}/${result.total} recipients.`);
        } else {
          const failMsg = result.failed && result.failed.length ? result.failed.map((f: any) => `${f.email}: ${f.error}`).join('; ') : 'No emails were delivered.';
          throw new Error(failMsg);
        }
      } else {
        setSuccess('Call for papers email sent successfully!');
      }
      setEmails([]);
      setSubject('Call for Papers');
      setMessage('');
      setAttachment(null);
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6">Call for Papers</h3>
      <div className="mb-4 flex gap-2">
        <input
          type="email"
          value={inputEmail}
          onChange={e => setInputEmail(e.target.value)}
          placeholder="Add author email"
          className="px-4 py-2 border rounded-lg flex-1"
        />
        <button
          type="button"
          onClick={handleAddEmail}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={16} /> Add
        </button>
        <button
          type="button"
          onClick={() => setEmails([])}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg ml-2"
        >
          Clear
        </button>
      </div>
      <div className="mb-4">
        {emails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {emails.map(email => (
              <span key={email} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                {email}
                <button type="button" onClick={() => handleRemoveEmail(email)}>
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="mb-4">
        <label className="block font-medium mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="px-4 py-2 border rounded-lg w-full"
        />
      </div>
      <div className="mb-6">
        <label className="block font-medium mb-1">Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={6}
          className="px-4 py-2 border rounded-lg w-full"
        />
      </div>
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <label className="block font-semibold text-amber-900 mb-2">Attachment (optional)</label>
        <p className="text-sm text-amber-800 mb-3">Attach a PDF or Word file here if you want to send it with the email.</p>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => setAttachment(e.target.files?.[0] || null)}
          className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-amber-800 hover:file:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {attachment && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
            <span className="truncate">{attachment.name}</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">Attach a PDF or Word document to include with the invitation email.</p>
      </div>
      <div className="flex gap-4 items-center">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || emails.length === 0 || !subject || !message}
          className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Send size={18} /> {sending ? 'Sending...' : 'Send'}
        </button>
        <button
          type="button"
          onClick={() => setEmails([])}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
        >
          Remove All
        </button>
      </div>
      {success && <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">{success}</div>}
      {error && <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}
    </div>
  );
}
