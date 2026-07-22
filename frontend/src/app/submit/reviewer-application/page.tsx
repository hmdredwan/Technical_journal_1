// src/app/submit/reviewer-application/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import { AlertCircle, Upload, Save, CheckCircle, UserCheck } from 'lucide-react';

export default function ReviewerApplicationPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    expertise: '',
    affiliation: '',
    publications: '',
    cv: null as File | null,
    availability: '2-4',
    interests: '',
    orcid: '',
    google_scholar: '',
    motivation: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // clear inline error for this field
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFormData(prev => ({ ...prev, cv: e.target.files![0] }));
      setFieldErrors(prev => ({ ...prev, cv: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSubmitted(false);

    // clear previous errors
    setFieldErrors({});

    if (!formData.full_name.trim()) {
      setFieldErrors({ full_name: 'Full name is required.' });
      setSubmitting(false);
      return;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setFieldErrors({ email: 'A valid email address is required.' });
      setSubmitting(false);
      return;
    }
    if (!formData.expertise.trim()) {
      setFieldErrors({ expertise: 'Field(s) of expertise is required.' });
      setSubmitting(false);
      return;
    }
    if (!formData.affiliation.trim()) {
      setFieldErrors({ affiliation: 'Current affiliation is required.' });
      setSubmitting(false);
      return;
    }
    if (!formData.cv) {
      setFieldErrors({ cv: 'Please upload your CV.' });
      setSubmitting(false);
      return;
    }

    const data = new FormData();
    data.append('full_name', formData.full_name.trim());
    data.append('email', formData.email.trim());
    data.append('expertise', formData.expertise.trim());
    data.append('affiliation', formData.affiliation.trim());
    data.append('publications', formData.publications.trim());
    data.append('availability', formData.availability);
    data.append('interests', formData.interests.trim());
    data.append('orcid', formData.orcid.trim());
    data.append('google_scholar', formData.google_scholar.trim());
    data.append('motivation', formData.motivation.trim());
    if (formData.cv) {
      data.append('cv', formData.cv);
    }

    try {
      const res = await fetch(apiUrl('reviewer-applications/'), {
        method: 'POST',
        body: data,
      });

      if (!res.ok) {
        let errMsg = 'Failed to submit application';
        try {
          const errData = await res.json();
            // Map backend field errors to inline errors when possible
            const newFieldErrors: Record<string,string> = {};
            if (errData && typeof errData === 'object') {
              for (const key of Object.keys(errData)) {
                const val = errData[key];
                if (['full_name','email','expertise','affiliation','cv','motivation','non_field_errors'].includes(key)) {
                  if (Array.isArray(val)) newFieldErrors[key === 'non_field_errors' ? 'non_field_errors' : key] = val.join(' ');
                  else newFieldErrors[key === 'non_field_errors' ? 'non_field_errors' : key] = String(val);
                }
              }
            }
            if (newFieldErrors.email) {
              setFieldErrors(prev => ({ ...prev, email: newFieldErrors.email }));
              errMsg = newFieldErrors.email;
            } else if (newFieldErrors.full_name) {
              setFieldErrors(prev => ({ ...prev, full_name: newFieldErrors.full_name }));
              errMsg = newFieldErrors.full_name;
            } else if (newFieldErrors.non_field_errors) {
              setError(newFieldErrors.non_field_errors);
              errMsg = newFieldErrors.non_field_errors;
            } else {
              errMsg = errData.detail || errMsg;
            }
        } catch {}
        throw new Error(errMsg);
      }

      setSubmitted(true);
      // Redirect to home after 4 seconds
      setTimeout(() => router.push('/'), 4000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-2xl p-8 md:p-10 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <UserCheck size={40} className="opacity-90" />
            <h1 className="text-3xl md:text-4xl font-bold">
              Apply to Become a Reviewer
            </h1>
          </div>
          <p className="text-lg md:text-xl opacity-95">
            Join our peer-review team for Technical Journal
          </p>
          <p className="mt-3 text-base opacity-90">
            No login required — just fill out the form below.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-b-2xl shadow-xl p-8 md:p-12 border border-t-0 border-gray-200">
          {submitted && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-8 rounded-xl mb-8 text-center">
              <CheckCircle className="mx-auto mb-4 text-green-600" size={64} />
              <h3 className="text-2xl font-bold mb-3">Application Received!</h3>
              <p className="text-lg mb-4">
                Thank you for your interest in becoming a reviewer.
              </p>
              <p className="text-base opacity-90">
                Our editorial team will review your application shortly.<br />
                You will be redirected to the homepage in a few seconds...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl mb-8 flex items-start gap-3">
              <AlertCircle size={28} className="mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold mb-1">Error</h4>
                <p>{error}</p>
              </div>
            </div>
          )}

          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Name & Email – Required for everyone */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 required">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Md. Redwan"
                  />
                  {fieldErrors.full_name && (
                    <p className="mt-2 text-sm text-red-600">{fieldErrors.full_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 required">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="your.email@example.com"
                  />
                  {fieldErrors.email && (
                    <p className="mt-2 text-sm text-red-600">{fieldErrors.email}</p>
                  )}
                </div>
              </div>

              {/* Expertise */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 required">
                  Field(s) of Expertise <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="expertise"
                  value={formData.expertise}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., River hydrology, Climate change impacts on water systems, Sediment transport modeling, GIS in hydrology..."
                />
                {fieldErrors.expertise && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.expertise}</p>
                )}
              </div>

              {/* Affiliation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 required">
                  Current Affiliation / Institution <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="affiliation"
                  value={formData.affiliation}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., Department of Water Resources Engineering, Bangladesh University of Engineering and Technology (BUET)"
                />
                  {fieldErrors.affiliation && (
                    <p className="mt-2 text-sm text-red-600">{fieldErrors.affiliation}</p>
                  )}
              </div>

              {/* CV Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 required">
                  Upload CV / Resume (PDF preferred) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl file:mr-4 file:py-2.5 file:px-6 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                />
                {fieldErrors.cv && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.cv}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Maximum file size: 10MB. Include your academic qualifications, research experience, and publication record.
                </p>
              </div>

              {/* Publications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Publications (recent 5–10 years, optional but recommended)
                </label>
                <textarea
                  name="publications"
                  value={formData.publications}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g.,• Ahmed et al. (2023) – River sediment dynamics in the Ganges-Brahmaputra Delta...&#10;• Khan & Rahman (2022) – Climate change impacts on river morphology..."
                />
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How many manuscripts can you review per year?
                </label>
                <select
                  name="availability"
                  value={formData.availability}
                  onChange={handleChange}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="1-2">1–2 reviews per year</option>
                  <option value="2-4">2–4 reviews per year (recommended)</option>
                  <option value="4-6">4–6 reviews per year</option>
                  <option value="6+">More than 6 reviews per year</option>
                </select>
              </div>

              {/* Research Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Research Interests / Keywords
                </label>
                <textarea
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., hydrological modeling, water quality assessment, remote sensing in river systems, climate adaptation strategies..."
                />
              </div>

              {/* ORCID & Google Scholar */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ORCID iD (optional)
                  </label>
                  <input
                    type="text"
                    name="orcid"
                    value={formData.orcid}
                    onChange={handleChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="0000-0001-2345-6789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Scholar Profile (optional)
                  </label>
                  <input
                    type="url"
                    name="google_scholar"
                    value={formData.google_scholar}
                    onChange={handleChange}
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="https://scholar.google.com/citations?user=..."
                  />
                </div>
              </div>

              {/* Motivation Statement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 required">
                  Why do you want to become a reviewer for Technical Journal? <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Please tell us in 150–400 words why you are interested in reviewing for our journal and how your expertise can contribute..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-10">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-12 py-4 rounded-xl font-semibold text-white min-w-[280px] flex items-center justify-center gap-3 shadow-lg transition-all ${
                    submitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 active:scale-98'
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      <Save size={22} />
                      Submit Reviewer Application
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-6">
                By submitting, you agree to our reviewer guidelines and ethical standards.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}