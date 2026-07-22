'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { apiUrl } from '@/utils/api';
import { ArrowLeft, Save, Upload } from 'lucide-react';

export default function ReviewerProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState({
    title: '',
    full_name: '',
    email: '',
    mobile_number: '',
    address: '',
    city: '',
    country: '',
    designation: '',
    department: '',
    orcid_id: '',
    google_scholar_url: '',
    payment_bank_name: '',
    payment_account_holder: '',
    payment_account_number: '',
    payment_bkash_number: '',
    payment_nagad_number: '',
    payment_paypal_email: '',
    payment_notes: '',
    profile_photo: null as File | null,
    cv: null as File | null,
  });
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [photoTooLarge, setPhotoTooLarge] = useState(false);
  const [cvError, setCvError] = useState('');
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [existingCvUrl, setExistingCvUrl] = useState<string | null>(null);
  const [existingCvName, setExistingCvName] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_CV_SIZE = 10 * 1024 * 1024; // 10MB

  const getFileNameFromPath = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };

  const validateFullName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Full name is required.';
    }
    if (!/^[A-Za-zÀ-ÿ]+(?:[ '-][A-Za-zÀ-ÿ]+)*$/.test(trimmed) || trimmed.length < 3) {
      return 'Please enter a valid full name.';
    }
    return '';
  };

  const validateMobileNumber = (mobile: string) => {
    const trimmed = mobile.trim();
    if (!trimmed) {
      return '';
    }
    const normalized = trimmed.replace(/[-\s]/g, '');
    if (!/^\+?\d{8,15}$/.test(normalized)) {
      return 'Enter a valid mobile number, e.g. +8801712345678.';
    }
    return '';
  };

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const response = await fetch(apiUrl('profile/'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profile (${response.status})`);
      }

      const data = await response.json();
      setProfileData(prev => ({
        ...prev,
        ...data,
        profile_photo: null,
        cv: null,
      }));

      if (data.profile_photo) {
        setPreviewPhoto(getMediaUrl(data.profile_photo));
      }

      if (data.cv) {
        const cvUrl = getMediaUrl(data.cv);
        setExistingCvUrl(cvUrl);
        setExistingCvName(getFileNameFromPath(data.cv));
      } else {
        setExistingCvUrl(null);
        setExistingCvName(null);
      }
    } catch (err: unknown) {
      setError('Failed to load profile. Please try again.');
      console.error('Profile fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const roleRaw = localStorage.getItem('user_role');
    const role = roleRaw ? roleRaw.toLowerCase() : '';

    if (!token || role !== 'reviewer') {
      router.push('/login');
      return;
    }

    fetchProfile(token);
  }, [fetchProfile, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'full_name') {
      setFullNameError(validateFullName(value));
    } else if (name === 'mobile_number') {
      setMobileError(validateMobileNumber(value));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files?.[0]) {
      const file = files[0];

      if (name === 'profile_photo') {
        setProfileData(prev => ({ ...prev, profile_photo: file }));
        const reader = new FileReader();
        reader.onloadend = () => setPreviewPhoto(reader.result as string);
        reader.readAsDataURL(file);

        if (file.size > MAX_PROFILE_PHOTO_SIZE) {
          setError('Profile photo must be 5MB or smaller. Please choose a smaller file.');
          setPhotoTooLarge(true);
        } else {
          setError('');
          setPhotoTooLarge(false);
        }
      } else if (name === 'cv') {
        const allowedExtensions = ['.pdf', '.doc', '.docx'];
        const normalizedName = file.name.toLowerCase();
        const hasAllowedExtension = allowedExtensions.some(ext => normalizedName.endsWith(ext));

        if (!hasAllowedExtension) {
          setCvError('Only PDF, DOC, and DOCX files are allowed.');
          setProfileData(prev => ({ ...prev, cv: null }));
          setCvFileName(null);
          return;
        }

        if (file.size > MAX_CV_SIZE) {
          setCvError('CV must be 10MB or smaller. Please choose a smaller file.');
          setProfileData(prev => ({ ...prev, cv: null }));
          setCvFileName(null);
          setExistingCvUrl(null);
          setExistingCvName(null);
          return;
        }

        setProfileData(prev => ({ ...prev, cv: file }));
        setCvFileName(file.name);
        setCvError('');
        setExistingCvUrl(null);
        setExistingCvName(null);
      }
    }
  };

  const getMediaUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('//')) return path;
    const clean = path.startsWith('/') ? path.slice(1) : path;
    return apiUrl(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const formData = new FormData();

      // Append text fields
      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== null && value !== '' && typeof value !== 'object') {
          formData.append(key, value.toString().trim());
        }
      });

      // Append files only if changed
      if (profileData.profile_photo) {
        formData.append('profile_photo', profileData.profile_photo);
      }
      if (profileData.cv) {
        formData.append('cv', profileData.cv);
      }

      if (photoTooLarge) {
        setError('Profile photo must be 5MB or smaller. Please choose a smaller file before saving.');
        setLoading(false);
        return;
      }

      const fullNameValidation = validateFullName(profileData.full_name);
      const mobileValidation = validateMobileNumber(profileData.mobile_number);

      if (fullNameValidation) {
        setFullNameError(fullNameValidation);
        setError('Please fix the form errors before saving.');
        setLoading(false);
        return;
      }

      if (mobileValidation) {
        setMobileError(mobileValidation);
        setError('Please fix the form errors before saving.');
        setLoading(false);
        return;
      }

      if (cvError) {
        setError('Please fix the CV upload error before saving.');
        setLoading(false);
        return;
      }

      const response = await fetch(apiUrl('profile/'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errMsg = 'Failed to update profile';

        try {
          const errData = await response.json();

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

      const updated = await response.json();

      setProfileData(prev => ({
        ...prev,
        ...updated,
        profile_photo: null,
        cv: null,
      }));

      if (updated.profile_photo) {
        setPreviewPhoto(`${getMediaUrl(updated.profile_photo)}?v=${Date.now()}`);
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile. Please try again.';
      setError(message);
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/reviewer-dashboard"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Update Profile</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Photo */}
          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Photo</h2>
            <div className="flex flex-col sm:flex-row items-start gap-6 min-h-[120px]">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 shadow-sm flex-shrink-0">
                {previewPhoto ? (
                  <Image
                    src={previewPhoto}
                    alt="Profile preview"
                    width={128}
                    height={128}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
                    No photo
                  </div>
                )}
              </div>

              <div className="flex-1">
                <label className="flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer transition font-medium shadow-sm">
                  <Upload size={18} />
                  Choose New Photo
                  <input
                    type="file"
                    name="profile_photo"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  Recommended: square image, JPG/PNG/GIF, max 5MB
                </p>
              </div>
            </div>
            <div className="mt-4 min-h-[1.5rem]">
              {photoTooLarge && (
                <p className="text-sm text-red-600">
                  Profile photo must be 5MB or smaller. Please choose a smaller file before saving.
                </p>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={profileData.title}
                  onChange={handleInputChange}
                  placeholder="Dr. / Prof. / Mr. / Ms."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="full_name"
                  value={profileData.full_name}
                  onChange={handleInputChange}
                  required
                  aria-invalid={!!fullNameError}
                  aria-describedby={fullNameError ? 'full-name-error' : undefined}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${fullNameError ? 'border-red-500 ring-red-200' : 'border-gray-300'}`}
                />
                {fullNameError && (
                  <p id="full-name-error" className="text-sm text-red-600 mt-2">{fullNameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  readOnly
                  aria-readonly="true"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">This email is linked to your account and cannot be changed.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  name="mobile_number"
                  value={profileData.mobile_number}
                  onChange={handleInputChange}
                  placeholder="+880 17XXXXXXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
                {mobileError && (
                  <p className="text-sm text-red-600 mt-2">{mobileError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={profileData.designation}
                  onChange={handleInputChange}
                  placeholder="e.g., Researcher, Lecturer"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  name="department"
                  value={profileData.department}
                  onChange={handleInputChange}
                  placeholder="e.g., Computer Science & Engineering"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  name="address"
                  value={profileData.address}
                  onChange={handleInputChange}
                  placeholder="House, Road, Area"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={profileData.city}
                  onChange={handleInputChange}
                  placeholder="Dhaka"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  name="country"
                  value={profileData.country}
                  onChange={handleInputChange}
                  placeholder="Bangladesh"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Payment Account Information */}
          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Account Information</h2>
            <p className="text-sm text-gray-600 mb-6">This information is used for reviewer payout records and invoice generation. Admins/editors can use it to confirm payment details for review work.</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                <input type="text" name="payment_bank_name" value={profileData.payment_bank_name} onChange={handleInputChange} placeholder="Example Bank" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name</label>
                <input type="text" name="payment_account_holder" value={profileData.payment_account_holder} onChange={handleInputChange} placeholder="Your name as per bank" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account Number</label>
                <input type="text" name="payment_account_number" value={profileData.payment_account_number} onChange={handleInputChange} placeholder="Account number" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">bKash Number</label>
                <input type="text" name="payment_bkash_number" value={profileData.payment_bkash_number} onChange={handleInputChange} placeholder="01XXXXXXXXX" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nagad Number</label>
                <input type="text" name="payment_nagad_number" value={profileData.payment_nagad_number} onChange={handleInputChange} placeholder="01XXXXXXXXX" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PayPal Email</label>
                <input type="email" name="payment_paypal_email" value={profileData.payment_paypal_email} onChange={handleInputChange} placeholder="reviewer@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Notes</label>
                <textarea name="payment_notes" value={profileData.payment_notes} onChange={handleInputChange} rows={3} placeholder="Any payout instructions or preferred transfer notes" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Academic & Professional Information</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ORCID ID</label>
                <input
                  type="text"
                  name="orcid_id"
                  value={profileData.orcid_id}
                  onChange={handleInputChange}
                  placeholder="0000-0000-0000-0000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your ORCID at <a href="https://orcid.org" target="_blank" className="text-blue-600 hover:underline">orcid.org</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Google Scholar Profile URL</label>
                <input
                  type="url"
                  name="google_scholar_url"
                  value={profileData.google_scholar_url}
                  onChange={handleInputChange}
                  placeholder="https://scholar.google.com/citations?user=..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Curriculum Vitae (CV)</label>
                <label htmlFor="cv-upload" className="flex items-center justify-between gap-3 px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 cursor-pointer transition">
                  <div className="flex items-center gap-3">
                    <Upload size={18} className="text-gray-500" />
                    <div>
                      <span className="font-medium text-gray-700">Upload or Replace CV</span>
                      <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX (max 10MB)</p>
                    </div>
                  </div>
                  <span className="text-sm text-blue-600">Browse</span>
                </label>
                <input
                  id="cv-upload"
                  type="file"
                  name="cv"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {cvFileName ? (
                  <p className="text-sm text-gray-700 mt-3">Selected file: {cvFileName}</p>
                ) : existingCvName ? (
                  <p className="text-sm text-gray-700 mt-3">
                    Existing CV:{' '}
                    {existingCvUrl ? (
                      <a href={existingCvUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {existingCvName}
                      </a>
                    ) : (
                      existingCvName
                    )}
                  </p>
                ) : null}
                {cvError && (
                  <p className="text-sm text-red-600 mt-2">{cvError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6">
            <Link
              href="/reviewer-dashboard"
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium text-center"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading || photoTooLarge || !!fullNameError || !!mobileError || !!cvError}
              className={`px-8 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 min-w-[160px] ${
                loading || photoTooLarge || fullNameError || mobileError || cvError
                  ? 'bg-blue-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}