// src/app/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import {
  User, Mail, Lock, Phone, Home, MapPin, Globe, Briefcase,
  Book, FileText, Camera, CheckCircle, AlertCircle, Upload, X
} from 'lucide-react';

// Country-City Mapping
const COUNTRY_CITIES: { [key: string]: string[] } = {
  'Bangladesh': ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet', 'Barisal', 'Ranpur'],
  'India': ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'],
  'Pakistan': ['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Newcastle', 'Sheffield'],
  'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra'],
  'Germany': ['Berlin', 'Munich', 'Cologne', 'Frankfurt', 'Hamburg', 'Düsseldorf', 'Dortmund', 'Essen'],
  'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier'],
  'Japan': ['Tokyo', 'Yokohama', 'Osaka', 'Kobe', 'Kyoto', 'Nagoya', 'Sapporo', 'Fukuoka'],
  'China': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Xi\'an', 'Nanjing'],
  'Singapore': ['Singapore'],
  'Malaysia': ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Kota Kinabalu', 'Petaling Jaya'],
  'Thailand': ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Hat Yai', 'Ubon Ratchathani'],
  'Indonesia': ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 'Palembang'],
  'Philippines': ['Manila', 'Cebu', 'Davao', 'Cagayan de Oro', 'Quezon City', 'Caloocan'],
  'Vietnam': ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hai Phong', 'Can Tho', 'Bien Hoa'],
  'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar'],
  'Egypt': ['Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Port Said', 'Luxor'],
  'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte'],
  'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Cancun', 'Acapulco', 'Mexico State'],
};

const COUNTRIES = Object.keys(COUNTRY_CITIES).sort();

interface FormDataType {
  title: string;
  first_name: string;
  last_name: string;
  surname: string;
  email: string;
  mobile_number: string;
  address: string;
  country: string;
  city: string;
  custom_city: string;
  designation: string;
  department: string;
  organization: string;
  orcid_id: string;
  google_scholar_url: string;
  role: string;
  password: string;
  password2: string;
  cv: File | null;
  profile_photo: File | null;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormDataType>({
    title: '',
    first_name: '',
    last_name: '',
    surname: '',
    email: '',
    mobile_number: '',
    address: '',
    country: '',
    city: '',
    custom_city: '',
    designation: '',
    department: '',
    organization: '',
    orcid_id: '',
    google_scholar_url: '',
    role: '',
    password: '',
    password2: '',
    cv: null,
    profile_photo: null,
  });

  const [authorRoleId, setAuthorRoleId] = useState<string | number>('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cvFileName, setCvFileName] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const router = useRouter();

  // Fetch author role ID (public endpoint)
  useEffect(() => {
    const fetchAuthorRole = async () => {
      try {
        const res = await fetch(apiUrl('roles/public/'));
        if (!res.ok) throw new Error('Failed to load roles');
        const data = await res.json();
        const authorRole = data.find((r: any) => r.name.toLowerCase() === 'author');
        if (authorRole) {
          setAuthorRoleId(authorRole.id);
          setFormData(prev => ({ ...prev, role: authorRole.id.toString() }));
        } else {
          setGeneralError('Author role not found. Please contact support.');
        }
      } catch (err) {
        setGeneralError('Failed to load role information. Please try again.');
        console.error(err);
      }
    };

    fetchAuthorRole();
  }, []);

  const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB
  const MAX_CV_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_CV_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const validateName = (value: string, fieldName: 'first_name' | 'last_name' | 'surname') => {
    const trimmed = value.trim();

    // Surname is optional; if empty, it's valid
    if (fieldName === 'surname' && !trimmed) return '';

    if (!trimmed) {
      return fieldName === 'first_name' ? 'First name is required' : fieldName === 'last_name' ? 'Last name is required' : 'Surname is required';
    }

    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[\-\' ]?[A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(trimmed)) {
      return fieldName === 'first_name' ? 'First name can contain only letters, spaces, hyphens or apostrophes' : fieldName === 'last_name' ? 'Last name can contain only letters, spaces, hyphens or apostrophes' : 'Surname can contain only letters, spaces, hyphens or apostrophes';
    }

    return '';
  };

  const validateCvFile = (file: File) => {
    const normalizedName = file.name.toLowerCase();
    const isAcceptedExtension = normalizedName.endsWith('.pdf') || normalizedName.endsWith('.doc') || normalizedName.endsWith('.docx');
    const isAcceptedType = ACCEPTED_CV_TYPES.includes(file.type);

    if (!isAcceptedExtension && !isAcceptedType) {
      return 'CV must be a PDF, DOC, or DOCX file.';
    }

    if (file.size > MAX_CV_SIZE) {
      return 'CV size must be 5MB or less.';
    }

    return '';
  };

  const validateProfilePhotoFile = (file: File) => {
    const normalizedName = file.name.toLowerCase();
    const isAcceptedExtension = normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg') || normalizedName.endsWith('.png') || normalizedName.endsWith('.webp');
    const isAcceptedType = ACCEPTED_IMAGE_TYPES.includes(file.type);

    if (!isAcceptedExtension && !isAcceptedType) {
      return 'Profile photo must be a JPG, PNG, or WEBP image.';
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      return 'Image size must be 2MB or less.';
    }

    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;

    if (files?.length) {
      const file = files[0];
      if (name === 'cv') {
        const cvError = validateCvFile(file);
        if (cvError) {
          setFieldErrors(prev => ({ ...prev, cv: cvError }));
          setFormData(prev => ({ ...prev, cv: null }));
          setCvFileName('');
          return;
        }

        setFieldErrors(prev => ({ ...prev, cv: '' }));
        setCvFileName(file.name);
        setFormData(prev => ({ ...prev, cv: file }));
      } else if (name === 'profile_photo') {
        const photoError = validateProfilePhotoFile(file);
        if (photoError) {
          setFieldErrors(prev => ({ ...prev, profile_photo: photoError }));
          setFormData(prev => ({ ...prev, profile_photo: null }));
          setPhotoPreview(null);
          return;
        }

        setFieldErrors(prev => ({ ...prev, profile_photo: '' }));
        setFormData(prev => ({ ...prev, profile_photo: file }));
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    } else {
      // Handle country and city changes with special reset logic
      if (name === 'country') {
        setFormData(prev => ({ ...prev, [name]: value, city: '', custom_city: '' }));
        setAvailableCities(COUNTRY_CITIES[value] || []);
      } else if (name === 'city') {
        setFormData(prev => ({
          ...prev,
          city: value,
          custom_city: value === 'Other' ? prev.custom_city : '',
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }

    // Clear or update validation error on change
    if (name === 'first_name' || name === 'last_name' || name === 'surname') {
      const nameError = validateName(value, name);
      setFieldErrors(prev => ({ ...prev, [name]: nameError }));
    } else {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCountrySearch = (query: string) => {
    setCountrySearch(query);
    if (query.length > 0) {
      setShowCountrySuggestions(true);
    } else {
      setShowCountrySuggestions(false);
    }
  };

  const selectCountry = (country: string) => {
    setFormData(prev => ({ ...prev, country, city: '', custom_city: '' }));
    setAvailableCities(COUNTRY_CITIES[country] || []);
    setCountrySearch('');
    setShowCountrySuggestions(false);
    setFieldErrors(prev => ({ ...prev, country: '' }));
  };

  const filteredCountries = countrySearch.length > 0
    ? COUNTRIES.filter(country =>
        country.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError('');
    setSuccess('');
    setShowMessage(false);

    // Client-side validation
    const errors: { [key: string]: string } = {};

    if (fieldErrors.cv) {
      errors.cv = fieldErrors.cv;
    } else if (formData.cv) {
      const cvError = validateCvFile(formData.cv);
      if (cvError) errors.cv = cvError;
    }

    if (fieldErrors.profile_photo) {
      errors.profile_photo = fieldErrors.profile_photo;
    } else if (formData.profile_photo) {
      const photoError = validateProfilePhotoFile(formData.profile_photo);
      if (photoError) errors.profile_photo = photoError;
    }

    const firstNameError = validateName(formData.first_name, 'first_name');
    const lastNameError = validateName(formData.last_name, 'last_name');
    const surnameError = validateName(formData.surname, 'surname');

    if (firstNameError) errors.first_name = firstNameError;
    if (lastNameError) errors.last_name = lastNameError;
    if (surnameError) errors.surname = surnameError;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    }
    if (!formData.country.trim()) {
      errors.country = 'Country is required';
    }
    if (!formData.city) {
      errors.city = 'City is required';
    }
    if (formData.city === 'Other' && !formData.custom_city.trim()) {
      errors.custom_city = 'Please enter your city';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    if (!formData.password2) {
      errors.password2 = 'Confirm your password';
    }
    if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (formData.password && formData.password2 && formData.password !== formData.password2) {
      errors.password2 = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const actualCity = formData.city === 'Other' ? formData.custom_city.trim() : formData.city;
    const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()} ${formData.surname.trim()}`;
    const submitData = {
      ...formData,
      city: actualCity,
      full_name: fullName,
    };

    const form = new FormData();

    // Append all text fields
    Object.entries(submitData).forEach(([key, value]) => {
      if (value !== null && value !== '' && typeof value !== 'object') {
        form.append(key, value.toString().trim());
      }
    });

    // Append files only if selected
    if (formData.cv) form.append('cv', formData.cv);
    if (formData.profile_photo) form.append('profile_photo', formData.profile_photo);

    try {
      const res = await fetch(apiUrl('register/'), {
        method: 'POST',
        body: form,
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        const newErrors: { [key: string]: string } = {};

        // Parse DRF-style errors
        Object.entries(result).forEach(([key, val]) => {
          if (Array.isArray(val)) newErrors[key] = val[0];
          else if (typeof val === 'string') newErrors[key] = val;
        });

        if (Object.keys(newErrors).length === 0) {
          newErrors.general = result.detail || result.error || 'Registration failed';
        }

        setFieldErrors(newErrors);
        throw new Error(newErrors.general || 'Validation failed');
      }

      setSuccess('Registration successful! A verification email has been sent. Please verify your email before logging in.');
      setShowMessage(true);
      setFormData({
        title: '',
        first_name: '',
        last_name: '',
        surname: '',
        email: '',
        mobile_number: '',
        address: '',
        country: '',
        city: '',
        custom_city: '',
        designation: '',
        department: '',
        organization: '',
        orcid_id: '',
        google_scholar_url: '',
        role: authorRoleId.toString(),
        password: '',
        password2: '',
        cv: null,
        profile_photo: null,
      });
      setCvFileName('');
      setPhotoPreview(null);
    } catch (err: any) {
      setGeneralError(err.message || 'An error occurred during registration.');
      setShowMessage(true);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-2xl transform hover:scale-[1.01] transition-transform duration-300 overflow-y-auto max-h-[90vh]">
        {/* Logo Link to Homepage */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-3 rounded-lg hover:opacity-80 transition group">
            <Image 
              src="/images/journal_logo.jpeg" 
              alt="Journal Logo" 
              width={60} 
              height={60}
              className="rounded-lg group-hover:shadow-lg transition"
            />
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-blue-700 group-hover:text-blue-800 transition">Technical Journal</span>
              <span className="text-xs text-gray-500">Back to Homepage</span>
            </div>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600">Join the Technical Journal community</p>
          <p className="text-sm text-gray-500 mt-2">
            Fields marked with <span className="text-red-600">*</span> are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Title (e.g. Dr., Prof.)"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {fieldErrors.title && <p className="text-red-600 text-sm mt-1">{fieldErrors.title}</p>}
          </div>

          {/* Name Fields */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="First name"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
              {fieldErrors.first_name && <p className="text-red-600 text-sm mt-1">{fieldErrors.first_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Last name"
                  required
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
              {fieldErrors.last_name && <p className="text-red-600 text-sm mt-1">{fieldErrors.last_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Surname
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleChange}
                  placeholder="Surname"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
              {fieldErrors.surname && <p className="text-red-600 text-sm mt-1">{fieldErrors.surname}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
            {fieldErrors.email && <p className="text-red-600 text-sm mt-1">{fieldErrors.email}</p>}
          </div>

          {/* Mobile Number */}
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="tel"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              placeholder="Mobile Number (e.g. +8801712345678)"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {fieldErrors.mobile_number && <p className="text-red-600 text-sm mt-1">{fieldErrors.mobile_number}</p>}
          </div>

          {/* Address */}
          <div className="relative">
            <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Address"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {fieldErrors.address && <p className="text-red-600 text-sm mt-1">{fieldErrors.address}</p>}
          </div>


          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={formData.country || countrySearch}
                onChange={(e) => {
                  const val = e.target.value;
                  if (formData.country && !countrySearch) {
                    setFormData(prev => ({ ...prev, country: '' }));
                  }
                  handleCountrySearch(val);
                }}
                onFocus={() => countrySearch.length > 0 && setShowCountrySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                placeholder="Search and select country"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>

            {showCountrySuggestions && filteredCountries.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <button
                    key={country}
                    type="button"
                    onClick={() => selectCountry(country)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 border-b last:border-b-0"
                  >
                    <Globe size={16} className="text-gray-400" />
                    <span>{country}</span>
                  </button>
                ))}
              </div>
            )}
            {fieldErrors.country && <p className="text-red-600 text-sm mt-1">{fieldErrors.country}</p>}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={!formData.country}
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a city</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>
            {fieldErrors.city && <p className="text-red-600 text-sm mt-1">{fieldErrors.city}</p>}
          </div>

          {formData.city === 'Other' && (
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="custom_city"
                value={formData.custom_city}
                onChange={handleChange}
                placeholder="Type your city name"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
              {fieldErrors.custom_city && <p className="text-red-600 text-sm mt-1">{fieldErrors.custom_city}</p>}
            </div>
          )}

          {/* Designation */}
          <div className="relative">
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="Designation (e.g. Professor)"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {fieldErrors.designation && <p className="text-red-600 text-sm mt-1">{fieldErrors.designation}</p>}
          </div>

          {/* Department */}
          <div className="relative">
            <Book className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Department"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {fieldErrors.department && <p className="text-red-600 text-sm mt-1">{fieldErrors.department}</p>}
          </div>

          {/* Organization */}
          <div className="relative">
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="organization"
              value={formData.organization}
              onChange={handleChange}
              placeholder="Organization"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {fieldErrors.organization && <p className="text-red-600 text-sm mt-1">{fieldErrors.organization}</p>}
          </div>

          {/* ORCID iD (optional) */}
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="orcid_id"
              value={formData.orcid_id}
              onChange={handleChange}
              placeholder="ORCID iD (optional)"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {fieldErrors.orcid_id && <p className="text-red-600 text-sm mt-1">{fieldErrors.orcid_id}</p>}
          </div>

          {/* Google Scholar URL (optional) */}
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="url"
              name="google_scholar_url"
              value={formData.google_scholar_url}
              onChange={handleChange}
              placeholder="Google Scholar Profile URL (optional)"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {fieldErrors.google_scholar_url && <p className="text-red-600 text-sm mt-1">{fieldErrors.google_scholar_url}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="Create a password"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
            {fieldErrors.password && <p className="text-red-600 text-sm mt-1">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                name="password2"
                value={formData.password2}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
            {fieldErrors.password2 && <p className="text-red-600 text-sm mt-1">{fieldErrors.password2}</p>}
          </div>

          {/* CV Upload */}
          <div className="relative">
            <label className="w-full flex items-center justify-between pl-4 pr-4 py-3 border border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-all min-h-[48px]">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="text-gray-600 truncate">
                  {cvFileName || 'Upload CV (optional)'}
                </span>
              </div>
              <span className="text-sm text-blue-600 font-medium">Choose file</span>
              <input
                type="file"
                name="cv"
                onChange={handleChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
              />
            </label>
            <div className="mt-2 text-sm text-gray-500">
              <p>Accepted formats: PDF, DOC, DOCX</p>
              <p>Maximum file size: 5MB</p>
            </div>
            {fieldErrors.cv && <p className="text-red-600 text-sm mt-1">{fieldErrors.cv}</p>}
          </div>

          {/* Profile Photo */}
          <div className="relative">
            <Camera className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <label className="w-full flex flex-col sm:flex-row items-center gap-4 px-4 py-3 border border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-all">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-300 flex-shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No photo</div>
                )}
              </div>
              <div className="flex-1">
                <span className="block text-gray-600">Upload Profile Photo (optional)</span>
                <span className="text-xs text-gray-500">Accepted: JPG, PNG, WEBP • Max 2MB</span>
              </div>
              <input
                type="file"
                name="profile_photo"
                onChange={handleChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
            </label>
            {fieldErrors.profile_photo && <p className="text-red-600 text-sm mt-1">{fieldErrors.profile_photo}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <User size={20} />
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Login here
          </Link>
          <span className="mx-2">•</span>
          <Link href="/" className="text-blue-600 hover:underline font-medium">
            Back to Homepage
          </Link>
        </div>
      </div>

      {showMessage && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-3xl p-6 shadow-2xl border ${success ? 'border-green-200 bg-white' : 'border-red-200 bg-white'}`}>
            <div className="flex items-start gap-4">
              <div className={`mt-1 ${success ? 'text-green-600' : 'text-red-600'}`}>
                {success ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-slate-900">
                    {success ? 'Registration Successful' : 'Registration Failed'}
                  </h3>
                </div>
                <p className={`mt-3 text-sm leading-6 ${success ? 'text-slate-700' : 'text-slate-700'}`}>
                  {success || generalError}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMessage(false)}
                className={`rounded-full p-2 transition ${success ? 'text-green-600 hover:bg-green-100' : 'text-red-600 hover:bg-red-100'}`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}