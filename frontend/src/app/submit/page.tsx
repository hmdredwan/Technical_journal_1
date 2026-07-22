// src/app/submit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { UserCheck } from 'lucide-react'; // ← added for reviewer icon

export default function SubmitPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check for access token and saved role
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role')?.toLowerCase() || null;

    setIsLoggedIn(!!token);
    setUserRole(role);
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth && isLoggedIn && userRole === 'author') {
      router.replace('/author-dashboard/submit');
    }
  }, [checkingAuth, isLoggedIn, userRole, router]);

  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    keywords: '',
    manuscriptType: 'original-research',
    files: null as FileList | null,
  });

  const [allUsers, setAllUsers] = useState<{ id: number; full_name: string; email: string }[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<{ id: number; full_name: string }[]>([]);
  const [correspondingAuthorId, setCorrespondingAuthorId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Fetch all authors for author dropdown (only if logged in)
  useEffect(() => {
    if (!isLoggedIn || userRole !== 'author') return;

    const fetchAuthors = async () => {
      try {
        const res = await fetch(apiUrl('authors/'));
        if (!res.ok) throw new Error('Failed to load authors');
        const data = await res.json();
        setAllUsers(data);
      } catch (err) {
        console.error('Failed to load author list:', err);
        setError('Failed to load author list. Please try again later.');
      }
    };

    fetchAuthors();
  }, [isLoggedIn, userRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, files: e.target.files }));
    }
  };

  const addAuthor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = Number(e.target.value);
    if (!userId) return;

    const user = allUsers.find(u => u.id === userId);
    if (user && !selectedAuthors.some(a => a.id === userId)) {
      setSelectedAuthors([...selectedAuthors, { id: user.id, full_name: user.full_name }]);
      if (!correspondingAuthorId) setCorrespondingAuthorId(user.id);
    }
    e.target.value = ''; // reset dropdown
  };

  const removeAuthor = (id: number) => {
    setSelectedAuthors(prev => prev.filter(a => a.id !== id));
    if (correspondingAuthorId === id) setCorrespondingAuthorId(null);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(selectedAuthors);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSelectedAuthors(items);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSubmitted(false);

    // Get fresh token
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      setSubmitting(false);
      return;
    }

    if (!formData.files || formData.files.length === 0) {
      setError('Please upload at least the main manuscript file.');
      setSubmitting(false);
      return;
    }

    if (selectedAuthors.length === 0) {
      setError('Please add at least one author.');
      setSubmitting(false);
      return;
    }

    if (!correspondingAuthorId) {
      setError('Please select a corresponding author.');
      setSubmitting(false);
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('abstract', formData.abstract);
    data.append('keywords', formData.keywords);
    data.append('manuscript_type', formData.manuscriptType);
    data.append('corresponding_author', correspondingAuthorId.toString());

    // Authors as ordered list of IDs
    selectedAuthors.forEach((author, index) => {
      data.append(`authors[${index}]`, author.id.toString());
    });

    // Append all files
    for (let i = 0; i < formData.files.length; i++) {
      data.append('files', formData.files[i]);
    }

    try {
      const res = await fetch(apiUrl('submissions/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: data,
      });

      if (!res.ok) {
        let errMsg = 'Submission failed';

        try {
          const errData = await res.json();

          if (errData.detail) {
            errMsg = errData.detail;
          } else if (errData.message) {
            errMsg = errData.message;
          } else if (typeof errData === 'object' && errData !== null) {
            const values = Object.values(errData);
            if (values.length > 0) {
              const firstValue = values[0];
              if (Array.isArray(firstValue) && firstValue.length > 0) {
                errMsg = String(firstValue[0]);
              } else if (typeof firstValue === 'string') {
                errMsg = firstValue;
              }
            }
          }
        } catch {
          // silent fallback
        }

        throw new Error(errMsg);
      }

      setSubmitted(true);
      setError('');
      // Reset form
      setFormData({
        title: '',
        abstract: '',
        keywords: '',
        manuscriptType: 'original-research',
        files: null,
      });
      setSelectedAuthors([]);
      setCorrespondingAuthorId(null);
      setTimeout(() => setSubmitted(false), 8000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit manuscript. Please try again.';
      setError(message);
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 md:p-16 max-w-lg w-full text-center border border-blue-100">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-6">Please Log In</h1>
          <p className="text-lg text-gray-700 mb-8">
            You must be logged in to submit your manuscript to Technical Journal.
          </p>
          <Link
            href={{ pathname: '/login', query: { next: '/submit' } }}
            className="inline-block px-10 py-4 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition text-lg mb-6"
          >
            Log In to Continue
          </Link>
          <div className="mt-6 flex flex-col gap-4 text-center">
            <Link href="/register" className="text-blue-600 hover:underline text-base font-medium">
              Create a new account
            </Link>

            {/* New Reviewer Application Button - placed right below "Create a new account" */}
            <Link
              href="/submit/reviewer-application"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl shadow transition text-base"
            >
              <UserCheck size={18} />
              Apply to Become a Reviewer
            </Link>

            <Link href="/" className="text-gray-500 hover:text-blue-700 text-base">
              Back to Home
            </Link>
            <Link href="/guidelines" className="text-gray-500 hover:text-blue-700 text-base">
              Author Guidelines
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoggedIn && userRole !== 'author') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 md:p-16 max-w-2xl w-full text-center border border-blue-100">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-6">Author Access Required</h1>
          <p className="text-lg text-gray-700 mb-8">
            You need to register as an author to submit a manuscript. Once your account has author access, you can submit from the author dashboard.
          </p>
          <div className="flex flex-col gap-4 items-center">
            <Link
              href="/register"
              className="inline-block px-10 py-4 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition text-lg"
            >
              Register as Author
            </Link>
            <Link
              href="/author-dashboard"
              className="inline-block px-10 py-4 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 transition text-lg"
            >
              Author Dashboard
            </Link>
            <Link href="/guidelines" className="text-gray-500 hover:text-blue-700 text-base">
              Read Author Guidelines
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoggedIn && userRole === 'author') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h1 className="text-2xl font-semibold text-gray-900">Redirecting to your author submission page...</h1>
          <p className="text-gray-600">Please wait while we take you to the author dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section
        className="relative bg-cover bg-center py-20 md:py-28 text-white"
        style={{ backgroundImage: "url('/images/submit-header-bg.jpeg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/70 to-indigo-950/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
            Manuscript Submission
          </h1>
          <p className="text-xl md:text-2xl max-w-4xl mx-auto opacity-95 drop-shadow-lg">
            Submit your research to Technical Journal
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
          {submitted && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl mb-8 text-center font-medium">
              Submission successful! Your manuscript has been received.<br />
              <small>We will review it shortly.</small>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl mb-8 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manuscript Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Enter the title of your manuscript"
              />
            </div>

            {/* Abstract */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Abstract *</label>
              <textarea
                name="abstract"
                value={formData.abstract}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Provide a concise summary of your manuscript (250-300 words recommended)"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Comma-separated keywords (e.g., river ecology, climate change, Bangladesh)"
              />
            </div>

            {/* Manuscript Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manuscript Type *</label>
              <select
                name="manuscriptType"
                value={formData.manuscriptType}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
              >
                <option value="original-research">Original Research Article</option>
                <option value="review-article">Review Article</option>
                <option value="short-communication">Short Communication</option>
                <option value="case-study">Case Study</option>
                <option value="technical-note">Technical Note</option>
              </select>
            </div>

            {/* Authors - Drag & Drop */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Authors *</label>
              <select
                onChange={addAuthor}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              >
                <option value="">Add Author...</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="authors">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="min-h-[100px] space-y-2 mt-4"
                    >
                      {selectedAuthors.map((author, index) => (
                        <Draggable key={author.id} draggableId={author.id.toString()} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-gray-500 cursor-move">☰</span>
                                <span className="font-medium">{author.full_name}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="corresponding"
                                    checked={correspondingAuthorId === author.id}
                                    onChange={() => setCorrespondingAuthorId(author.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-600">Corresponding</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeAuthor(author.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Files * (Main manuscript + supplementary if any)
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted: PDF, DOC, DOCX. Main file should be named clearly.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={submitting}
                className={`px-10 py-4 rounded-xl font-medium transition text-white min-w-[200px] ${
                  submitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit Manuscript'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}