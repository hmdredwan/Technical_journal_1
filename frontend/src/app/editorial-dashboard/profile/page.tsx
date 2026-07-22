'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiUrl } from '@/utils/api';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';

export default function EditorialProfilePage() {
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
    profile_photo: null as File | null,
    cv: null as File | null,
  });
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    // Safe role handling – fallback to empty string
    const roleRaw = localStorage.getItem('user_role');
    const role = roleRaw ? roleRaw.toLowerCase() : '';

    const allowedRoles = [
      'editorial_board',
      'editorial',
      'editor_in_chief',
      'managing_editor',
      'associate_editor',
    ];

    if (!token || !allowedRoles.includes(role)) {
      router.push('/login');
      return;
    }

    fetchProfile(token);
  }, [router]);

  const fetchProfile = async (token: string) => {
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
    } catch (err: any) {
      setError('Failed to load profile. Please try again.');
      console.error('Profile fetch error:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }));
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
      } else if (name === 'cv') {
        setProfileData(prev => ({ ...prev, cv: file }));
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

    // Text fields
    Object.entries(profileData).forEach(([key, value]) => {
      if (key !== 'profile_photo' && key !== 'cv' && value !== null && value !== undefined) {
        formData.append(key, value.toString().trim());
      }
    });

    // Files (only if changed/selected)
    if (profileData.profile_photo) {
      formData.append('profile_photo', profileData.profile_photo);
    }
    if (profileData.cv) {
      formData.append('cv', profileData.cv);
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

    // Update local state
    setProfileData(prev => ({
      ...prev,
      ...updated,
      profile_photo: null,
      cv: null,
    }));

    // Refresh photo preview with cache busting
    if (updated.profile_photo) {
      setPreviewPhoto(`${getMediaUrl(updated.profile_photo)}?v=${Date.now()}`);
      setPhotoVersion(prev => prev + 1);
    }

    setSuccess('Profile updated successfully!');
    setTimeout(() => setSuccess(''), 4000);
  } catch (err: any) {
    setError(err.message || 'Failed to update profile. Please try again.');
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
              href="/editorial-dashboard"
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
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 shadow-sm">
                {previewPhoto ? (
                  <img
                    src={previewPhoto}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">No photo</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  value={profileData.full_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={profileData.designation}
                  onChange={handleInputChange}
                  placeholder="e.g., Professor, Associate Editor"
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
                  placeholder="e.g., Department of Environmental Science"
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
                <label className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 cursor-pointer transition">
                  <Upload size={18} className="text-gray-500" />
                  <div className="text-center">
                    <span className="font-medium text-gray-700">Upload or Replace CV</span>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX (max 10MB)</p>
                  </div>
                  <input
                    type="file"
                    name="cv"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6">
            <Link
              href="/editorial-dashboard"
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium text-center"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className={`px-8 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 min-w-[160px] ${
                loading
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