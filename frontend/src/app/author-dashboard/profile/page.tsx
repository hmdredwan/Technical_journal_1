// src/app/author-dashboard/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserDashboardLayout from '@/components/user/UserDashboardLayout';
import { ArrowLeft, Save, X } from 'lucide-react';
import { apiUrl } from '@/utils/api';

interface UserProfile {
  id?: number;
  email: string;
  full_name: string;
  title?: string;
  mobile_number?: string;
  address?: string;
  city?: string;
  country?: string;
  designation?: string;
  department?: string;
  orcid_id?: string;
  google_scholar_url?: string;
  profile_photo?: string;
  cv?: string;
}

export default function AuthorProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [photoTooLarge, setPhotoTooLarge] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFileName, setCvFileName] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    full_name: '',
    title: '',
    mobile_number: '',
    address: '',
    city: '',
    country: '',
    designation: '',
    department: '',
    orcid_id: '',
    google_scholar_url: '',
  });

  const [formData, setFormData] = useState<UserProfile>(profile);
  const [mobileNumberError, setMobileNumberError] = useState('');
  const [imageVersion, setImageVersion] = useState(0);
  const MAX_AUTHOR_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'author') {
      router.push('/login');
      return;
    }

    fetchProfile(token);
  }, [router]);

  const fetchProfile = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl('profile/'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        console.error('Profile fetch failed', response.status, body);
        throw new Error(`Failed to load profile (${response.status})`);
      }

      const data = await response.json();
      setProfile(data);
      setFormData(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const cleanPhoneInput = (value: string) => {
    const cleaned = value.replace(/[^(+\d)]/g, '');
    return cleaned.startsWith('+')
      ? '+' + cleaned.slice(1).replace(/\+/g, '')
      : cleaned.replace(/\+/g, '');
  };

  const formatBangladeshMobileForDisplay = (value: string) => {
    const cleaned = cleanPhoneInput(value);
    const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;

    if (digits.startsWith('880')) {
      const local = digits.slice(3);
      const part1 = local.slice(0, 2);
      const part2 = local.slice(2, 6);
      const part3 = local.slice(6, 14);
      let result = '+880';
      if (part1) result += part1;
      if (part2) result += `-${part2}`;
      if (part3) result += `-${part3}`;
      return result;
    }

    if (digits.startsWith('01')) {
      const part1 = digits.slice(0, 5);
      const part2 = digits.slice(5, 11);
      let result = part1;
      if (part2) result += `-${part2}`;
      return result;
    }

    return cleaned;
  };

  const getBangladeshMobileError = (value: string, allowPartial = true) => {
    const cleaned = cleanPhoneInput(value);
    if (!cleaned) return '';

    const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
    const local = digits.startsWith('880') ? `0${digits.slice(3)}` : digits;

    if (!local.startsWith('01')) {
      return 'Use Bangladesh number: +8801XXXXXXXXX or 01XXXXXXXXX. ';
    }

    if (!/^01[3-9]/.test(local)) {
      return 'Bangladesh mobile must start with 013-019.';
    }

    if (digits.startsWith('880')) {
      if (digits.length > 13) {
        return 'Bangladesh number should have exactly 10 digits after +880.';
      }
      if (digits.length < 13) {
        return allowPartial ? '' : 'Bangladesh number should be +880 followed by 10 digits, e.g. +8801712345678. ';
      }
    } else {
      if (local.length > 11) {
        return 'Phone number is too long for Bangladesh. Use exactly 11 digits after 0. ';
      }
      if (local.length < 11) {
        return allowPartial ? '' : 'Phone number is too short. Use 11 digits after 0, e.g. 01712345678.';
      }
    }

    if (!/^01[3-9]\d{8}$/.test(local)) {
      return 'Enter a valid Bangladesh mobile number, e.g. 01712345678 or +8801712345678. ';
    }

    return '';
  };

  const isBangladeshPhoneValue = (value: string, country?: string) => {
    const cleaned = cleanPhoneInput(value);
    const countryCode = country?.trim().toLowerCase();
    return countryCode === 'bangladesh' || countryCode === 'bd' || cleaned.startsWith('+880') || cleaned.startsWith('880') || cleaned.startsWith('01');
  };

  const validatePhoneNumber = (value: string, country?: string, allowPartial = true) => {
    const cleaned = cleanPhoneInput(value);
    if (!cleaned) return true;

    if (isBangladeshPhoneValue(cleaned, country)) {
      return getBangladeshMobileError(cleaned, allowPartial) === '';
    }

    const internationalPhoneRegex = /^\+?[1-9]\d{7,14}$/;
    const nationalPhoneRegex = /^0\d{8,14}$/;
    return internationalPhoneRegex.test(cleaned) || nationalPhoneRegex.test(cleaned);
  };

  const formatMobileInput = (value: string, country?: string) => {
    const cleaned = cleanPhoneInput(value);
    const countryCode = country?.trim().toLowerCase();

    if (isBangladeshPhoneValue(cleaned, country)) {
      return formatBangladeshMobileForDisplay(cleaned);
    }

    return cleaned;
  };

  const convertMobileToE164 = (value: string, country?: string) => {
    const cleaned = cleanPhoneInput(value);
    const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
    if (country?.trim().toLowerCase() === 'bangladesh' || digits.startsWith('880') || digits.startsWith('01')) {
      const local = digits.startsWith('880') ? `0${digits.slice(3)}` : digits;
      if (/^01[3-9]\d{8}$/.test(local)) {
        return `+88${local}`;
      }
      return null;
    }
    return cleaned.startsWith('+') ? cleaned : cleaned;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedValue = name === 'mobile_number'
      ? formatMobileInput(value, formData.country)
      : value;

    if (name === 'mobile_number') {
      const error = updatedValue
        ? isBangladeshPhoneValue(updatedValue, formData.country)
          ? getBangladeshMobileError(updatedValue, true)
          : validatePhoneNumber(updatedValue, formData.country, true)
            ? ''
            : 'Enter a valid phone number. Use +countrycode and digits, or Bangladesh format +8801XXXXXXXXX / 01XXXXXXXXX.'
        : '';
      setMobileNumberError(error);
    }

    setFormData(prev => ({
      ...prev,
      [name]: updatedValue,
    }));
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setProfilePhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      if (file.size > MAX_AUTHOR_PROFILE_PHOTO_SIZE) {
        setError('Profile photo must be 2MB or smaller. Please choose a smaller file.');
        setPhotoTooLarge(true);
      } else {
        setError('');
        setPhotoTooLarge(false);
      }
    } else {
      setProfilePhotoFile(null);
      setProfilePhotoPreview(null);
      setPhotoTooLarge(false);
      setError('');
    }
  };

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCvFile(file);
      setCvFileName(file.name);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Authentication token not found');
      return;
    }

    if (photoTooLarge) {
      setError('Profile photo must be 2MB or smaller. Please choose a smaller file before saving.');
      return;
    }

    try {
      setLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('full_name', formData.full_name.trim());
      formDataToSend.append('title', formData.title?.trim() || '');
      const mobileNumber = formData.mobile_number?.trim() || '';
      const normalizedMobile = cleanPhoneInput(mobileNumber);
      const mobileError = normalizedMobile
        ? isBangladeshPhoneValue(normalizedMobile, formData.country)
          ? getBangladeshMobileError(normalizedMobile, false)
          : validatePhoneNumber(normalizedMobile, formData.country, false)
            ? ''
            : 'Enter a valid phone number before saving. Use +countrycode and digits, or Bangladesh format +8801XXXXXXXXX / 01XXXXXXXXX.'
        : '';
      if (mobileError) {
        setMobileNumberError(mobileError);
        setError('Please fix the mobile number before saving.');
        setLoading(false);
        return;
      }
      const mobileValueToSend = normalizedMobile ? convertMobileToE164(normalizedMobile, formData.country) : '';
      if (normalizedMobile && mobileValueToSend === null) {
        setMobileNumberError('Enter a valid Bangladesh mobile number before saving.');
        setError('Please fix the mobile number before saving.');
        setLoading(false);
        return;
      }
      formDataToSend.append('mobile_number', mobileValueToSend ?? '');
      formDataToSend.append('address', formData.address?.trim() || '');
      formDataToSend.append('city', formData.city?.trim() || '');
      formDataToSend.append('country', formData.country?.trim() || '');
      formDataToSend.append('designation', formData.designation?.trim() || '');
      formDataToSend.append('department', formData.department?.trim() || '');
      formDataToSend.append('orcid_id', formData.orcid_id?.trim() || '');
      formDataToSend.append('google_scholar_url', formData.google_scholar_url?.trim() || '');

      if (cvFile) {
        formDataToSend.append('cv', cvFile);
      }
      if (profilePhotoFile) {
        formDataToSend.append('profile_photo', profilePhotoFile);
      }

      const response = await fetch(apiUrl('profile/'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type here — browser handles multipart/form-data
        },
        body: formDataToSend,
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // not JSON
      }

      if (!response.ok) {
        console.error('Profile update failed', response.status, text);
        let errMsg = `Failed to update profile (${response.status})`;

        if (data) {
          if (typeof data === 'string') {
            errMsg = data;
          } else if (data.detail) {
            errMsg = data.detail;
          } else if (data.message) {
            errMsg = data.message;
          }

          if (data?.mobile_number) {
            const mobileMsg = Array.isArray(data.mobile_number)
              ? String(data.mobile_number[0])
              : String(data.mobile_number);
            setMobileNumberError(mobileMsg);
            setError('Please fix the mobile number before saving.');
            setLoading(false);
            return;
          }

          if (typeof data === 'object') {
            const entries = Object.entries(data);
            if (entries.length > 0) {
              const [key, value] = entries[0];
              if (Array.isArray(value) && value.length > 0) {
                errMsg = `${key}: ${String(value[0])}`;
              } else if (typeof value === 'string') {
                errMsg = `${key}: ${value}`;
              }
            }
          }
        }

        throw new Error(errMsg);
      }

      const profileData = data?.profile ? data.profile : data;
      setProfile(profileData);
      setFormData(profileData);
      setImageVersion(v => v + 1);
      setProfilePhotoFile(null);
      setProfilePhotoPreview(null);
      setCvFile(null);
      setCvFileName('');
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setCvFile(null);
    setCvFileName('');
    setIsEditing(false);
    setError('');
  };

  // Build correct URL for media files (profile_photo & cv)
  const getMediaUrl = (path?: string | null, version?: number) => {
    if (!path) return '';

    // Already absolute URL
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
      return version ? `${path}?v=${version}` : path;
    }

    // Relative path → use apiUrl helper
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const baseUrl = apiUrl(cleanPath);
    return version ? `${baseUrl}?v=${version}` : baseUrl;
  };

  if (loading && Object.keys(profile).every(key => !profile[key as keyof UserProfile])) {
    return (
      <UserDashboardLayout role="author">
        <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout role="author">
      <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
        {/* Back Button */}
        <Link
          href="/author-dashboard"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        {/* Success / Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">My Profile</h1>
            <button
              onClick={() => (isEditing ? handleCancel() : setIsEditing(true))}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                isEditing
                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="e.g., Dr., Prof., Mr."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled={true}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
              <input
                type="tel"
                name="mobile_number"
                value={formData.mobile_number || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="01712-345678 or +8801712345678"
                inputMode="tel"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${mobileNumberError ? 'border-red-400 focus:border-red-400' : 'border-gray-300'}`}
              />
              <p className="mt-2 text-sm text-gray-500">Example: 01712-345678, +8801712345678, or 8801712345678</p>
              {mobileNumberError && (
                <p className="mt-2 text-sm text-red-600">{mobileNumberError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="e.g., Senior Researcher"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                name="department"
                value={formData.department || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="e.g., Environmental Science"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ORCID ID</label>
              <input
                type="text"
                name="orcid_id"
                value={formData.orcid_id || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="0000-0000-0000-0000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Google Scholar URL</label>
              <input
                type="url"
                name="google_scholar_url"
                value={formData.google_scholar_url || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="https://scholar.google.com/citations?user=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea
              name="address"
              value={formData.address || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              rows={3}
              placeholder="Enter your full address..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Profile Photo */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0">
                {profilePhotoPreview ? (
                  <img
                    src={profilePhotoPreview}
                    alt="Profile preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-sm"
                  />
                ) : profile.profile_photo ? (
                  <img
                    src={getMediaUrl(profile.profile_photo, imageVersion)}
                    alt="Profile photo"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-sm"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-gray-300 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">No photo</span>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className={`w-full px-4 py-2 border rounded-lg file:mr-4 file:py-2 file:px-5 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${photoTooLarge ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Recommended: square image, max 2MB
                  </p>
                  {photoTooLarge && (
                    <p className="mt-2 text-sm text-red-600">
                      Profile photo must be 2MB or smaller. Please choose a smaller file before saving.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CV Upload */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Curriculum Vitae (CV)</label>

            {profile.cv && !cvFileName && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {profile.cv.split('/').pop() || 'Current CV'}
                  </p>
                  <a
                    href={getMediaUrl(profile.cv)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Download current CV
                  </a>
                </div>
              </div>
            )}

            {isEditing && (
              <div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCvChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-5 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {cvFileName && (
                  <p className="mt-2 text-sm text-green-600">
                    Selected: {cvFileName}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                <X size={20} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || photoTooLarge || !!mobileNumberError}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition font-medium min-w-[140px]"
              >
                <Save size={20} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </UserDashboardLayout>
  );
}