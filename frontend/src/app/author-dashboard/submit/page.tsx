// src/app/author-dashboard/submit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserDashboardLayout from '@/components/user/UserDashboardLayout';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { apiUrl } from '@/utils/api';

function ManuscriptSubmitForm() {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    keywords: '',
    manuscriptType: 'original-research',
    files: null as FileList | null,
    manualAuthors: '',              // comma-separated text
    conflictOfInterest: '',         // new
    acknowledgement: '',            // new
    originalityDeclaration: false,
  });

  const [allUsers, setAllUsers] = useState<{ id: number; full_name: string; email: string }[]>([]);
  const [submissionPeriods, setSubmissionPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [selectedAuthors, setSelectedAuthors] = useState<{ id: number; full_name: string }[]>([]);
  const [correspondingAuthorId, setCorrespondingAuthorId] = useState<number | null>(null);
  const [authorSearch, setAuthorSearch] = useState('');
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({});
  const [token, setToken] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get token
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      setToken(accessToken);
    }
  }, []);

  // Fetch active submission periods for authors
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await fetch(apiUrl('public/submission-periods/'), { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load submission periods (${res.status})`);
        const data = await res.json();
        const periods = Array.isArray(data) ? data : data.results || [];
        setSubmissionPeriods(periods);
        if (periods.length > 0) {
          setSelectedPeriodId(periods[0].id);
        }
      } catch (err: any) {
        console.error('Submission periods fetch error:', err);
      }
    };

    fetchPeriods();
  }, []);

  // Fetch registered authors
  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const res = await fetch(apiUrl('authors/'), {
          cache: 'no-store',
        });

        if (!res.ok) throw new Error(`Failed to load authors (${res.status})`);

        const data = await res.json();
        setAllUsers(Array.isArray(data) ? data : data.results || []);
      } catch (err: any) {
        setError('Failed to load author list.');
        console.error('Authors fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthors();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'title') {
      setFieldErrors(prev => ({ ...prev, title: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, files: e.target.files }));
    }
  };

  const filteredUsers = allUsers.filter(user => {
    const query = authorSearch.trim().toLowerCase();
    // Show all unselected users when no search query, or filter by query
    if (!query) return !selectedAuthors.some(a => a.id === user.id);
    return (
      !selectedAuthors.some(a => a.id === user.id) &&
      (user.full_name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
    );
  });

  // Show dropdown when user focuses on search or types something
  const showDropdown = showAuthorDropdown || authorSearch.trim().length > 0;

  const handleAuthorSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthorSearch(e.target.value);
    setShowAuthorDropdown(e.target.value.trim().length > 0);
  };

  const addRegisteredAuthor = (user: { id: number; full_name: string; email: string }) => {
    if (!user || selectedAuthors.some(a => a.id === user.id)) return;

    setSelectedAuthors([...selectedAuthors, { id: user.id, full_name: user.full_name }]);
    if (!correspondingAuthorId) setCorrespondingAuthorId(user.id);
    setAuthorSearch('');
    setShowAuthorDropdown(false);
  };

  const handleAuthorInputBlur = () => {
    // Delay hiding to allow click on dropdown item
    setTimeout(() => {
      setShowAuthorDropdown(false);
    }, 200);
  };

  const removeAuthor = (id: number) => {
    setSelectedAuthors(prev => prev.filter(a => a.id !== id));
    if (correspondingAuthorId === id) setCorrespondingAuthorId(null);
  };

  const moveAuthorUp = (index: number) => {
    if (index === 0) return;
    const items = [...selectedAuthors];
    [items[index], items[index - 1]] = [items[index - 1], items[index]];
    setSelectedAuthors(items);
  };

  const moveAuthorDown = (index: number) => {
    if (index === selectedAuthors.length - 1) return;
    const items = [...selectedAuthors];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    setSelectedAuthors(items);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    setSubmitted(false);

    if (!token) {
      setError('Please login first.');
      setSubmitting(false);
      return;
    }

    if (!formData.files || formData.files.length === 0) {
      setError('Please upload the main manuscript file.');
      setSubmitting(false);
      return;
    }

    if (!formData.originalityDeclaration) {
      setError('Please confirm the originality declaration before submitting.');
      setSubmitting(false);
      return;
    }

    if (!selectedPeriodId) {
      setError('Please select a submission period before submitting your manuscript.');
      setSubmitting(false);
      return;
    }

    if (selectedAuthors.length === 0 && !formData.manualAuthors.trim()) {
      setError('Please add at least one author (registered or manual).');
      setSubmitting(false);
      return;
    }

    if (!correspondingAuthorId && selectedAuthors.length > 0) {
      setError('Please select a corresponding author from registered authors.');
      setSubmitting(false);
      return;
    }

    const data = new FormData();
    data.append('submission_period', String(selectedPeriodId));
    data.append('title', formData.title.trim());
    data.append('abstract', formData.abstract.trim());
    data.append('keywords', formData.keywords.trim());
    data.append('manuscript_type', formData.manuscriptType);
    
    // Registered authors
    selectedAuthors.forEach(author => {
      data.append('authors', author.id.toString());
    });

    // Manual authors
    data.append('manual_authors', formData.manualAuthors.trim());

    // New fields
    data.append('conflict_of_interest', formData.conflictOfInterest.trim());
    data.append('acknowledgement', formData.acknowledgement.trim());
    data.append('originality_declaration', String(formData.originalityDeclaration));

    // Corresponding author
    if (correspondingAuthorId) {
      data.append('corresponding_author', correspondingAuthorId.toString());
    }

    // Files
    if (formData.files) {
      Array.from(formData.files).forEach(file => {
        data.append('files', file);
      });
    }

    try {
      const res = await fetch(apiUrl('submissions/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      if (!res.ok) {
        const errData: any = await res.json().catch(() => ({}));
        let msg = 'Submission failed';
        let titleError = '';

        if (errData.detail) msg = errData.detail;
        else if (errData.non_field_errors) msg = errData.non_field_errors[0];
        else if (errData.title) {
          titleError = Array.isArray(errData.title) ? String(errData.title[0]) : String(errData.title);
          msg = titleError;
        } else {
          const firstVal = Object.values(errData || {})[0] as any;
          if (Array.isArray(firstVal) && firstVal.length) msg = String(firstVal[0]);
          else if (typeof firstVal === 'string') msg = firstVal;
        }

        setFieldErrors(prev => ({ ...prev, title: titleError }));
        throw new Error(msg);
      }

      // Success
      setSubmitted(true);
      setError('');

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/author-dashboard');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading author list...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit New Manuscript</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl mb-8 text-center">
          {error}
        </div>
      )}

      {/* Success Modal with Blurry Background */}
      {submitted && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg 
                className="w-10 h-10 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              Manuscript Submitted Successfully!
            </h3>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              Thank you for your submission.<br />
              Our editorial team will review it shortly.
            </p>

            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-600"></div>
            </div>
            
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      )}

      {/* Form content - hidden when success modal is shown */}
      {!submitted && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Submission Period + Title */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Submission Period <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedPeriodId ?? ''}
                onChange={(e) => setSelectedPeriodId(Number(e.target.value) || null)}
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                {submissionPeriods.length === 0 ? (
                  <option value="">No active submission periods available</option>
                ) : (
                  submissionPeriods.map((period: any) => (
                    <option key={period.id} value={period.id}>
                      {period.title} — Vol {period.volume || 'N/A'}, Issue {period.issue || 'N/A'}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-2 text-sm text-gray-500">Choose the submission period that matches your manuscript entry.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manuscript Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className={`w-full px-5 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${fieldErrors.title ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                placeholder="Full title of your manuscript"
              />
              {fieldErrors.title && (
                <p className="mt-2 text-sm text-red-600">{fieldErrors.title}</p>
              )}
            </div>
          </div>

          {/* Manuscript Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manuscript Type <span className="text-red-600">*</span>
            </label>
            <select
              name="manuscriptType"
              value={formData.manuscriptType}
              onChange={handleChange}
              required
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="original-research">Original Research Article</option>
              <option value="review">Review Article</option>
              <option value="short-communication">Short Communication</option>
              <option value="case-study">Case Study</option>
            </select>
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Abstract <span className="text-red-600">*</span>
            </label>
            <textarea
              name="abstract"
              value={formData.abstract}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Concise summary (200-300 words)"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords (comma separated) <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              required
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. river hydrology, climate change, Bangladesh"
            />
          </div>

          {/* Authors Section */}
          <div className="border-t pt-8">
            <h3 className="text-xl font-semibold mb-6">Authors Information</h3>

            {/* Registered Authors Search */}
            <div className="mb-6 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Registered Author 
              </label>
              <input
                type="text"
                value={authorSearch}
                onChange={handleAuthorSearchChange}
                onFocus={() => setShowAuthorDropdown(authorSearch.trim().length > 0)}
                onBlur={handleAuthorInputBlur}
                placeholder="Search by name or email"
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              
              {/* Author Dropdown List */}
              {showDropdown && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => addRegisteredAuthor(user)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </button>
                  ))}
                </div>
              )}
              
              {showDropdown && filteredUsers.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                  No matching authors found
                </div>
              )}
              
              <p className="mt-2 text-sm text-gray-500">
                Type to search for registered authors by name or email, then click to add.
              </p>
            </div>

            {/* Manual Authors */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Additional Authors (optional) (type names, comma separated)
              </label>
              <textarea
                name="manualAuthors"
                value={formData.manualAuthors}
                onChange={handleChange}
                rows={2}
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. John Doe, Jane Smith, Md. Redwan"
              />
              <p className="mt-1 text-sm text-gray-500">
                Use this for co-authors who are not registered in the system.
              </p>
            </div>

            {/* Selected Registered Authors List */}
            {selectedAuthors.length > 0 && (
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-gray-700">Selected Registered Authors:</h4>
                {selectedAuthors.map((author, index) => (
                  <div
                    key={author.id}
                    className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-bold text-blue-700 w-8 text-center">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium">{author.full_name}</p>
                        <p className="text-sm text-gray-600">
                          {allUsers.find(u => u.id === author.id)?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => moveAuthorUp(index)}
                        disabled={index === 0}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                        title="Move up"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAuthorDown(index)}
                        disabled={index === selectedAuthors.length - 1}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                        title="Move down"
                      >
                        <ArrowDown size={18} />
                      </button>

                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="corresponding"
                          checked={correspondingAuthorId === author.id}
                          onChange={() => setCorrespondingAuthorId(author.id)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm whitespace-nowrap">Corresponding</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeAuthor(author.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Remove"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-gray-500">
              Order authors using arrows. First author is primary. Select corresponding author.
            </p>
          </div>

          {/* Conflict of Interest */}
          <div className="border-t pt-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conflict of Interest
            </label>
            <textarea
              name="conflictOfInterest"
              value={formData.conflictOfInterest}
              onChange={handleChange}
              rows={3}
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Declare any potential conflicts of interest (e.g., financial, personal, institutional). Write 'None' if no conflict exists."
            />
          </div>

          {/* Acknowledgement */}
          <div className="border-t pt-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Acknowledgements
            </label>
            <textarea
              name="acknowledgement"
              value={formData.acknowledgement}
              onChange={handleChange}
              rows={3}
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Acknowledge funding sources, contributors, institutions, etc. Leave blank if none."
            />
          </div>

          {/* Originality Declaration */}
          <div className="border-t pt-8">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="originalityDeclaration"
                checked={formData.originalityDeclaration}
                onChange={handleChange}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                required
              />
              <span className="text-sm text-gray-700">
                I confirm that this manuscript is original, has not been published previously, is not under consideration elsewhere, and that all authors have approved its submission to this journal.
              </span>
            </label>
          </div>

          {/* File Upload */}
          <div className="border-t pt-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Manuscript Files <span className="text-red-600">*</span>
            </label>
            <input
              type="file"
              name="files"
              multiple
              accept=".doc,.docx,.pdf,.tex,.zip"
              onChange={handleFileChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-2 text-sm text-gray-500">
              Main manuscript required. Supplementary files optional (max 25MB total recommended).
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-8 flex justify-center">
            <button
              type="submit"
              disabled={submitting || (!selectedAuthors.length && !formData.manualAuthors.trim()) || !token}
              className={`px-12 py-5 bg-blue-600 text-white font-bold text-xl rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 ${
                submitting ? 'animate-pulse' : ''
              }`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Manuscript'
              )}
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-6 text-center">
            By submitting, you agree to our{' '}
            <Link href="/guidelines" className="text-blue-600 hover:underline">
              Author Guidelines
            </Link>{' '}
            and journal policies.
          </p>
        </form>
      )}
    </div>
  );
}

export default function SubmitPage() {
  return (
    <UserDashboardLayout role="author">
      <ManuscriptSubmitForm />
    </UserDashboardLayout>
  );
}