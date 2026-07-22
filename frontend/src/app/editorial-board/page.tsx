'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiUrl } from '@/utils/api';

const PLACEHOLDER_IMAGE = '/images/placeholder-person.jpg';

interface EditorialMember {
  id: number;
  name: string;
  title: string;
  affiliation: string;
  photo: string | null;
  expertise?: string;
  country?: string;
  email?: string;
  role_type: string;
}

export default function EditorialBoardPage() {
  const [members, setMembers] = useState<EditorialMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(apiUrl('editorial-board/public/'), { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load editorial board');
        return res.json();
      })
      .then(data => {
        setMembers(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load editorial board');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading Editorial Board...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-xl">
        {error}
      </div>
    );
  }

  // Group members by role_type
  const groupedMembers = members.reduce((acc: Record<string, EditorialMember[]>, member) => {
    const key = member.role_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(member);
    return acc;
  }, {});

  // Order of role groups (customize as needed)
  const roleOrder = [
    'editor_in_chief',
    'executive_editor',
    'managing_editor',
    'associate_editor',
    'member',
    'reviewers_panel',
    'advisory_board',
    'other',
  ];

  // Format role names nicely
  const formatRoleName = (role: string) => {
    return role
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Safe image source handler
  const getImageSrc = (photoPath: string | null | undefined) => {
    if (!photoPath) return PLACEHOLDER_IMAGE;

    if (photoPath.startsWith('http') || photoPath.startsWith('//')) {
      return photoPath;
    }

    const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
    return apiUrl(cleanPath);
  };

  // Special roles that should be displayed as centered prominent cards (not in grid)
  const prominentRoles = ['editor_in_chief', 'executive_editor'];

  // Roles that should be displayed in grid layout
  const gridRoles = roleOrder.filter(role => !prominentRoles.includes(role));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <section
        className="relative bg-cover bg-center py-20 md:py-28 text-white"
        style={{ backgroundImage: "url('/images/edit_cover.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/70 to-indigo-950/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
            Editorial Board
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl max-w-4xl mx-auto opacity-95 drop-shadow-lg">
            Distinguished scholars and experts guiding Technical Journal
          </p>
        </div>
      </section>

      {/* Board Members Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        {/* Render prominent roles (Editor-in-Chief, Executive Editor, etc.) as centered cards */}
        {prominentRoles.map(roleType => {
          const membersList = groupedMembers[roleType];
          if (!membersList || membersList.length === 0) return null;

          return (
            <div key={roleType} className="mb-24">
              <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10 text-gray-900">
                {formatRoleName(roleType)}
              </h2>
              
              {/* For multiple members in same prominent role, stack them vertically centered */}
              <div className="flex flex-col items-center gap-8">
                {membersList.map((member) => (
                  <div key={member.id} className="max-w-5xl w-full mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                    <div className="md:flex items-stretch">
                      {/* Image */}
                      <div className="relative md:w-2/5 h-80 md:h-auto bg-gray-50 flex items-center justify-center p-8">
                        <div className="relative w-full h-full max-h-[400px]">
                          <Image
                            src={getImageSrc(member.photo)}
                            alt={member.name || member.title}
                            fill
                            className="object-contain"
                            unoptimized
                            placeholder="blur"
                            blurDataURL="/images/placeholder-person.jpg"
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-8 md:p-12 flex-1 flex flex-col justify-center">
                        <h3 className="text-3xl font-bold text-gray-900 mb-4">
                          {member.name}
                        </h3>
                        <p className="text-2xl text-blue-700 font-medium mb-6">
                          {member.title}
                        </p>
                        <p className="text-xl text-gray-700 mb-6">
                          {member.affiliation}
                        </p>
                        {member.expertise && (
                          <p className="text-lg text-gray-600 italic mb-8">
                            Expertise: {member.expertise}
                          </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-6 text-lg">
                          {member.country && (
                            <p className="text-gray-700">
                              <strong>Location:</strong> {member.country}
                            </p>
                          )}
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="text-blue-600 hover:underline hover:text-blue-800 transition"
                            >
                              {member.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Render other roles in grid layout */}
        {gridRoles.map(roleType => {
          const membersList = groupedMembers[roleType];
          if (!membersList || membersList.length === 0) return null;

          return (
            <div key={roleType} className="mb-20">
              <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10 text-gray-900">
                {formatRoleName(roleType)}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {membersList.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative h-64 sm:h-72 bg-gray-50 flex items-center justify-center p-6">
                      <div className="relative w-full h-full">
                        <Image
                          src={getImageSrc(member.photo)}
                          alt={member.name || 'Editorial Member'}
                          fill
                          className="object-contain p-4"
                          unoptimized
                          placeholder="blur"
                          blurDataURL="/images/placeholder-person.jpg"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-grow text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {member.name}
                      </h3>
                      <p className="text-blue-700 font-medium mb-3">
                        {member.title}
                      </p>
                      <p className="text-gray-700 mb-4 flex-grow">
                        {member.affiliation}
                      </p>
                      {member.expertise && (
                        <p className="text-sm text-gray-600 italic mb-4">
                          {member.expertise}
                        </p>
                      )}
                      <div className="text-sm text-gray-600 space-y-1 mt-auto">
                        {member.country && <p>{member.country}</p>}
                        {member.email && (
                          <a
                            href={`mailto:${member.email}`}
                            className="text-blue-600 hover:underline block"
                          >
                            {member.email}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* No members fallback */}
        {Object.keys(groupedMembers).length === 0 && (
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold text-gray-700">
              No Editorial Board Members Added Yet
            </h3>
            <p className="mt-4 text-gray-600">The journal team will be updated soon.</p>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <p className="text-lg text-gray-700 mb-6">
            Interested in joining our editorial team, reviewers panel, or advisory board?
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-5 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
          >
            Contact the Editorial Office
          </Link>
        </div>
      </section>
    </div>
  );
}