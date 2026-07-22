// src/app/archives/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Calendar, 
  BookOpen 
} from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import { apiUrl } from '@/utils/api';

interface Paper {
  id: number;
  title: string;
  authors: string;
  abstract: string;
  pages: string;
  doi: string;
  file: string;
  views: number;
  downloads: number;
  issue_number?: number;
  issue_period?: string;
  volume_number?: number;
  volume_year?: number;
}

interface Issue {
  id: number;
  number: number;
  period: string;
  publication_date: string | null;
  cover_image: string | null;
  introductory_file: string | null;
  papers: Paper[];
  papers_count?: number;
  volume?: number;
}

interface Volume {
  id: number;
  number: number;
  year: number;
  title: string;
  issues: Issue[];
}

interface YearGroup {
  year: number;
  volumes: Volume[];
}

export default function ArchivesPage() {
  const [archives, setArchives] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedVolumeId, setExpandedVolumeId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchResults, setSearchResults] = useState<{ papers: Paper[], volumes: Volume[], issues: Issue[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        // Fetch volumes (newest first) - adjust endpoint if needed
        const volumesRes = await fetch(apiUrl('public/volumes/'), {
          cache: 'no-store',
        });
        if (!volumesRes.ok) throw new Error('Failed to load volumes');
        const volumesData = await volumesRes.json();
        const volumes = Array.isArray(volumesData) ? volumesData : volumesData.results || [];

        // Fetch issues
        const issuesRes = await fetch(apiUrl('public/issues/'), {
          cache: 'no-store',
        });
        if (!issuesRes.ok) throw new Error('Failed to load issues');
        const issuesData = await issuesRes.json();
        const issues = Array.isArray(issuesData) ? issuesData : issuesData.results || [];

        // Fetch papers
        const papersRes = await fetch(apiUrl('public/papers/'), {
          cache: 'no-store',
        });
        let papersByIssue: { [key: number]: Paper[] } = {};
        if (papersRes.ok) {
          const papersData = await papersRes.json();
          const papersList = Array.isArray(papersData) ? papersData : papersData.results || [];
          papersList.forEach((paper: Paper & { issue: number }) => {
            if (!papersByIssue[paper.issue]) papersByIssue[paper.issue] = [];
            papersByIssue[paper.issue].push(paper);
          });
        }

        // Build hierarchy: volumes → issues → papers
        const volumeMap: { [key: number]: Volume } = {};
        volumes.forEach((vol: Volume) => {
          volumeMap[vol.id] = { ...vol, issues: [] };
        });

        issues.forEach((issue: Issue & { volume: number }) => {
          if (volumeMap[issue.volume]) {
            volumeMap[issue.volume].issues.push({
              ...issue,
              papers: papersByIssue[issue.id] || [],
            });
          }
        });

        // Group by year
        const yearMap: { [key: number]: YearGroup } = {};
        Object.values(volumeMap).forEach((volume) => {
          if (!yearMap[volume.year]) {
            yearMap[volume.year] = { year: volume.year, volumes: [] };
          }
          yearMap[volume.year].volumes.push(volume);
        });

        const sortedArchives = Object.values(yearMap)
          .sort((a, b) => b.year - a.year)
          .map((group) => ({
            ...group,
            volumes: group.volumes.sort((a, b) => b.number - a.number),
          }));

        setArchives(sortedArchives);
      } catch (err: any) {
        setError(err.message || 'Failed to load archives');
      } finally {
        setLoading(false);
      }
    };

    fetchArchives();
  }, []);

  const toggleVolume = (volumeId: number) => {
    setExpandedVolumeId((prev) => (prev === volumeId ? null : volumeId));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() && !selectedYear) return;

    setIsSearching(true);
    setSearchResults(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (selectedYear) {
        params.append('year', selectedYear);
      }

      // Search papers
      const papersRes = await fetch(apiUrl(`public/papers/?${params.toString()}`), {
        cache: 'no-store',
      });
      let papers: Paper[] = [];
      if (papersRes.ok) {
        const papersData = await papersRes.json();
        papers = Array.isArray(papersData) ? papersData : papersData.results || [];
      }

      // Search volumes
      const volumesRes = await fetch(apiUrl(`public/volumes/?${params.toString()}`), {
        cache: 'no-store',
      });
      let volumes: Volume[] = [];
      if (volumesRes.ok) {
        const volumesData = await volumesRes.json();
        volumes = Array.isArray(volumesData) ? volumesData : volumesData.results || [];
      }

      // Search issues
      const issuesRes = await fetch(apiUrl(`public/issues/?${params.toString()}`), {
        cache: 'no-store',
      });
      let issues: Issue[] = [];
      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        issues = Array.isArray(issuesData) ? issuesData : issuesData.results || [];
      }

      setSearchResults({ papers, volumes, issues });
    } catch (err: any) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedYear('');
    setSearchResults(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-xl text-gray-700 font-medium">Loading journal archives...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl max-w-2xl text-center shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Error Loading Archives</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center bg-no-repeat py-24 md:py-32 text-white overflow-hidden"
        style={{
          backgroundImage: "url('/images/archives.png')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 drop-shadow-2xl">
            Journal Archives
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto opacity-95 leading-relaxed">
            Explore every volume and issue of <span className="font-semibold">Technical Journal</span>
          </p>
        </div>
      </section>

      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Archives' },
        ]}
      />

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        {/* Search/Filter Bar */}
        <div className="mb-16 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Find Past Publications</h2>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by title, author, keyword, DOI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg shadow-sm"
            />
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg shadow-sm"
            >
              <option value="">All Years</option>
              {archives.map((yearGroup) => (
                <option key={yearGroup.year} value={yearGroup.year}>
                  {yearGroup.year}
                </option>
              ))}
            </select>
            <button 
              type="submit"
              disabled={isSearching}
              className="bg-blue-600 text-white px-10 py-4 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Searching...' : 'Search Archives'}
            </button>
            {searchResults && (
              <button 
                type="button"
                onClick={clearSearch}
                className="bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:bg-gray-300 transition text-lg"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Search Results</h2>
            
            {/* Papers Results */}
            {searchResults.papers.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText size={24} className="text-blue-600" />
                  Articles ({searchResults.papers.length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.papers.map((paper) => (
                    <Link
                      key={paper.id}
                      href={`/articles/${paper.id}`}
                      className="group block bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition"
                    >
                      <h4 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700">
                        {paper.title}
                      </h4>
                      <p className="text-gray-600 text-sm mb-2">{paper.authors}</p>
                      {(paper.volume_number || paper.issue_number || paper.issue_period) && (
                        <p className="text-sm text-gray-500 mb-3">
                          {paper.volume_number ? `Volume ${paper.volume_number}` : ''}
                          {paper.issue_number ? ` ${paper.issue_number ? `• Issue ${paper.issue_number}` : ''}` : ''}
                          {paper.issue_period ? ` • ${paper.issue_period}` : ''}
                        </p>
                      )}
                      {paper.abstract && (
                        <p className="text-gray-500 text-sm mb-3 line-clamp-3">{paper.abstract}</p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {paper.pages && <span className="text-gray-500">pp. {paper.pages}</span>}
                        </span>
                        <span className="text-blue-600 group-hover:underline">View article</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Volumes Results */}
            {searchResults.volumes.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen size={24} className="text-blue-600" />
                  Volumes ({searchResults.volumes.length})
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {searchResults.volumes.map((volume) => {
                    const issueCount = searchResults.issues.filter((issue) => issue.volume === volume.id).length || volume.issues?.length || 0;
                    return (
                      <div key={volume.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition">
                        <h4 className="font-bold text-lg text-gray-900 mb-2">Volume {volume.number}</h4>
                        <p className="text-gray-600 text-sm">{volume.year}</p>
                        {volume.title && <p className="text-gray-500 text-sm mt-1">{volume.title}</p>}
                        <p className="text-blue-600 text-sm mt-2">{issueCount} Issues</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Issues Results */}
            {searchResults.issues.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar size={24} className="text-blue-600" />
                  Issues ({searchResults.issues.length})
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {searchResults.issues.map((issue) => (
                    <div key={issue.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition">
                      <h4 className="font-bold text-lg text-gray-900 mb-2">Issue {issue.number}</h4>
                      {issue.period && <p className="text-gray-600 text-sm">{issue.period}</p>}
                      {issue.publication_date && (
                        <p className="text-gray-500 text-sm mt-1">
                          {new Date(issue.publication_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                        </p>
                      )}
                      <p className="text-blue-600 text-sm mt-2">{(issue.papers_count ?? issue.papers?.length) || 0} Articles</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchResults.papers.length === 0 && searchResults.volumes.length === 0 && searchResults.issues.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100">
                <FileText size={64} className="mx-auto text-gray-400 mb-6" />
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No Results Found</h3>
                <p className="text-gray-600 text-lg">Try different keywords or select a different year.</p>
              </div>
            )}
          </div>
        )}

        {/* Archives by Year - Only show when not searching */}
        {!searchResults && (
          archives.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100">
              <BookOpen size={64} className="mx-auto text-gray-400 mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">No Archives Available Yet</h3>
              <p className="text-gray-600 text-lg">Check back soon for published volumes and issues.</p>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              {archives.map((yearGroup) => (
                <div
                  key={yearGroup.year}
                  className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
                >
                  <div className="px-5 py-6 sm:px-6 sm:py-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.32em] font-semibold text-blue-100">
                          Published Volume
                        </p>
                        <h2 className="text-2xl md:text-3xl font-extrabold mt-2">
                          {yearGroup.year}
                        </h2>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-blue-100">{yearGroup.volumes.length} Volume{yearGroup.volumes.length !== 1 ? 's' : ''}</p>
                        <p className="mt-2 text-xl font-bold">{yearGroup.volumes[0]?.number ?? '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-5 sm:px-5 sm:py-6 space-y-4">
                    {yearGroup.volumes.map((volume) => (
                      <div
                        key={volume.id}
                        className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                      >
                        <button
                          onClick={() => toggleVolume(volume.id)}
                          className="w-full px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white hover:bg-blue-50 transition"
                        >
                          <div>
                            <p className="text-[11px] font-semibold text-blue-600">Volume {volume.number}</p>
                            {volume.title && (
                              <p className="text-sm font-semibold text-gray-900 mt-1">{volume.title}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-gray-500">{volume.issues.length} Issue{volume.issues.length !== 1 ? 's' : ''}</p>
                            {expandedVolumeId === volume.id ? (
                              <ChevronUp size={20} className="text-blue-600 mt-1 sm:mt-0" />
                            ) : (
                              <ChevronDown size={20} className="text-blue-600 mt-1 sm:mt-0" />
                            )}
                          </div>
                        </button>

                        {expandedVolumeId === volume.id && (
                          <div className="p-4 bg-white border-t border-gray-200">
                            {volume.issues.length === 0 ? (
                              <p className="text-gray-500 py-6 text-center italic">
                                No issues published in this volume yet.
                              </p>
                            ) : (
                              <div className="grid gap-4 sm:grid-cols-2">
                                {volume.issues.map((issue) => (
                                  <Link
                                    key={issue.id}
                                    href={`/archives/volume/${volume.number}/issue/${issue.number}`}
                                    className="group bg-gray-50 rounded-2xl border border-gray-200 p-3 hover:border-blue-300 hover:shadow-lg transition"
                                  >
                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-900 mb-1">Issue {issue.number}</h4>
                                      {issue.period && (
                                        <p className="text-xs text-gray-600 mb-1">{issue.period}</p>
                                      )}
                                      {issue.publication_date && (
                                        <p className="text-[11px] text-gray-500 mb-1">
                                          {new Date(issue.publication_date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                          })}
                                        </p>
                                      )}
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-medium text-blue-600">
                                          {(issue.papers_count ?? issue.papers?.length ?? 0)} Article{(issue.papers_count ?? issue.papers?.length ?? 0) !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-blue-600 group-hover:translate-x-1 transition-transform text-xs">View →</span>
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Footer Note */}
        {!searchResults && archives.length > 0 && (
          <div className="mt-20 text-center text-gray-600">
            <p className="text-lg">
              Looking for older issues or special editions?
            </p>
            <Link href="/contact" className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800 font-medium">
              Contact the Editorial Office <span className="ml-1">→</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}