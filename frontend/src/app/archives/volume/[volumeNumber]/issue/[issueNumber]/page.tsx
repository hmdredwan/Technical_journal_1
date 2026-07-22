// src/app/archives/volume[volumeNumber]/issue[issueNumber]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download, FileText, Eye, Calendar, BookOpen, Share2, Copy, Mail } from 'lucide-react';
import { useParams } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import { apiUrl } from '@/utils/api';

interface Paper {
  id: number;
  title: string;
  authors: string;
  abstract: string;
  keywords: string;
  pages: string;
  doi: string;
  file: string;
  views: number;
  downloads: number;
}

interface Volume {
  id: number;
  number: number;
  year: number;
  title: string;
}

interface Issue {
  id: number;
  volume: Volume;
  number: number;
  period: string;
  publication_date: string | null;
  cover_image: string | null;
  introductory_file: string | null;
  papers: Paper[];
}

export default function IssueDetailPage() {
  const params = useParams();
  const volumeNumber = params.volumeNumber as string;
  const issueNumber = params.issueNumber as string;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<number>>(new Set());
  const [downloadNotice, setDownloadNotice] = useState({
    open: false,
    title: '',
    message: '',
  });

  const [downloadOptions, setDownloadOptions] = useState<
    Record<number, { include_cover: boolean; include_intro: boolean }>
  >({});

  const [citationFormat, setCitationFormat] = useState<Record<number, string>>({});

  const resolveMediaUrl = (filePath?: string | null) => {
    if (!filePath) return '/images/issues/default-cover.jpg';

    const value = filePath.trim();
    if (!value) return '/images/issues/default-cover.jpg';

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//')) {
      return value;
    }

    let cleanPath = value.replace(/^\/+/, '');
    if (!cleanPath.startsWith('media/')) cleanPath = `media/${cleanPath}`;

    let baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://rri.websoftbd.net/api';
    baseUrl = baseUrl.replace(/\/api\/?$/, '');

    return `${baseUrl.replace(/\/$/, '')}/${cleanPath}`;
  };

  // Truncate abstract function
  const truncateAbstract = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Toggle abstract expansion
  const toggleAbstract = (paperId: number) => {
    setExpandedAbstracts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        setLoading(true);
        setError('');

        const issueRes = await fetch(
          apiUrl(`public/issues/?volume__number=${volumeNumber}&number=${issueNumber}`),
          { cache: 'no-store' }
        );

        if (!issueRes.ok) throw new Error(`Failed to load issue: ${issueRes.status}`);

        const issueData = await issueRes.json();
        const matchingIssues = Array.isArray(issueData) ? issueData : issueData.results || [];

        if (matchingIssues.length === 0) throw new Error('Issue not found');

        const foundIssue = matchingIssues[0];

        const papersRes = await fetch(
          apiUrl(`public/papers/?issue=${foundIssue.id}`),
          { cache: 'no-store' }
        );

        let papers: Paper[] = [];
        if (papersRes.ok) {
          const papersData = await papersRes.json();
          papers = Array.isArray(papersData) ? papersData : papersData.results || [];
        }

        setIssue({ ...foundIssue, papers });

        const initialOptions: Record<number, { include_cover: boolean; include_intro: boolean }> = {};
        papers.forEach((p) => {
          initialOptions[p.id] = { include_cover: false, include_intro: false };
        });
        setDownloadOptions(initialOptions);
      } catch (err: any) {
        setError(err.message || 'Failed to load this issue');
      } finally {
        setLoading(false);
      }
    };

    fetchIssue();
  }, [volumeNumber, issueNumber]);

  // Fixed: Proper view increment when clicking "Read More"
  const handleReadMore = async (paper: Paper) => {
    try {
      // Increment view count on backend
      await fetch(apiUrl(`papers/${paper.id}/increment-view/`), {
        method: 'POST',
      });

      // Optimistically update UI
      setIssue((prev) =>
        prev
          ? {
              ...prev,
              papers: prev.papers.map((p) =>
                p.id === paper.id ? { ...p, views: p.views + 1 } : p
              ),
            }
          : null
      );
    } catch (err) {
      console.error('Failed to increment view count:', err);
    }

    // Navigate to article detail page
    window.location.href = `/articles/${paper.id}`;
  };

  const handleIncrementDownload = (paperId: number) => {
    fetch(apiUrl(`papers/${paperId}/increment-download/`), {
      method: 'POST',
    }).catch((err) => console.error('Download increment failed:', err));
  };

  const handleCustomDownload = async (paper: Paper) => {
    const options = downloadOptions[paper.id] || { include_cover: false, include_intro: false };

    try {
      handleIncrementDownload(paper.id);

      setIssue((prev) =>
        prev
          ? {
              ...prev,
              papers: prev.papers.map((p) =>
                p.id === paper.id ? { ...p, downloads: p.downloads + 1 } : p
              ),
            }
          : null
      );

      const formData = new FormData();
      formData.append('include_cover', options.include_cover.toString());
      formData.append('include_intro', options.include_intro.toString());

      const res = await fetch(apiUrl(`papers/${paper.id}/custom-download/`), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Server error (${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const titleWords = paper.title.split(' ').slice(0, 4).join('_').replace(/[^a-zA-Z0-9_]/g, '');
      const volumeNum = issue?.volume?.number ?? volumeNumber;
      const issueNum = issue?.number ?? issueNumber;
      link.download = `RRI_V${volumeNum}I${issueNum}_${titleWords}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Custom download error:', err);
      alert(err.message || 'Failed to download custom PDF. Please try again.');
    }
  };

  // Citation & Sharing
  const formatPaperCitation = (paper: Paper, format: string) => {
    const year = issue?.publication_date
      ? new Date(issue.publication_date).getFullYear()
      : 'n.d.';

    const doiUrl = paper.doi ? `https://doi.org/${paper.doi}` : '';
    const journalName = 'Technical Journal';

    switch (format) {
      case 'MLA':
        return `${paper.authors}. "${paper.title}." ${journalName}, vol. ${issue?.volume?.number ?? 'n/a'}, no. ${issue?.number ?? 'n/a'}, ${year}, pp. ${paper.pages || 'n.p.'}${doiUrl ? `, ${doiUrl}` : ''}.`;
      case 'Chicago':
        return `${paper.authors}. "${paper.title}." ${journalName} ${issue?.volume?.number ?? 'n/a'}, no. ${issue?.number ?? 'n/a'} (${year}): ${paper.pages || 'n.p.'}.${doiUrl ? ` ${doiUrl}` : ''}`;
      case 'BibTeX':
        return `@article{paper${paper.id},\n  title = {${paper.title}},\n  author = {${paper.authors}},\n  journal = {${journalName}},\n  volume = {${issue?.volume?.number ?? 'n/a'}},\n  number = {${issue?.number ?? 'n/a'}},\n  year = {${year}},\n  pages = {${paper.pages || 'n.p.'}},\n  doi = {${paper.doi || ''}}\n}`;
      default: // APA
        return `${paper.authors} (${year}). ${paper.title}. ${journalName}, ${issue?.volume?.number ?? 'n/a'}(${issue?.number ?? 'n/a'}), ${paper.pages || 'n.p.'}.${doiUrl ? ` ${doiUrl}` : ''}`;
    }
  };

  const handleCopyCitation = async (paper: Paper) => {
    const format = citationFormat[paper.id] || 'APA';
    const text = formatPaperCitation(paper, format);
    try {
      await navigator.clipboard.writeText(text);
      alert('Citation copied to clipboard!');
    } catch {
      prompt('Copy this citation manually:', text);
    }
  };

  const getPaperUrl = (paper: Paper) => `${window.location.origin}/articles/${paper.id}`;

  const handleShare = (paper: Paper, channel: 'twitter' | 'linkedin' | 'facebook' | 'email') => {
    const url = encodeURIComponent(getPaperUrl(paper));
    const text = encodeURIComponent(`${paper.title} by ${paper.authors}`);

    let shareUrl = '';
    if (channel === 'twitter') shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
    else if (channel === 'linkedin') shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    else if (channel === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    else if (channel === 'email') shareUrl = `mailto:?subject=${encodeURIComponent(paper.title)}&body=${text}%0A%0A${url}`;

    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-md bg-white p-10 rounded-2xl shadow-xl">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Issue Not Found</h2>
          <p className="text-gray-600 text-lg mb-8">{error || 'This issue could not be loaded.'}</p>
          <Link href="/archives" className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg">
            Back to Archives
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center bg-no-repeat py-24 md:py-32 text-white overflow-hidden"
        style={{ backgroundImage: "url('/images/archives.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 drop-shadow-2xl">
            Volume {issue.volume?.number ?? volumeNumber} • Issue {issue.number}
          </h1>
          <p className="text-2xl md:text-3xl font-medium opacity-95">{issue.period}</p>
          {issue.publication_date && (
            <p className="text-xl mt-4 opacity-90">
              {new Date(issue.publication_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </section>

      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Archives', href: '/archives' },
          { label: `Volume ${issue.volume?.number ?? volumeNumber}` },
          { label: `Issue ${issue.number}` },
        ]}
      />

      {downloadNotice.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-gray-900">{downloadNotice.title}</h3>
            <p className="mt-3 text-gray-600">{downloadNotice.message}</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDownloadNotice({ open: false, title: '', message: '' })}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Sidebar with Cover Image */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden sticky top-8">
              <div className="relative aspect-[4/5] bg-gray-100">
                <Image
                  src={resolveMediaUrl(issue.cover_image)}
                  alt={`Cover of Volume ${issue.volume?.number} Issue ${issue.number}`}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 420px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>

              <div className="p-8 space-y-5">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                  Vol. {issue.volume?.number ?? volumeNumber}, Issue {issue.number}
                </h2>

                <div className="space-y-4 text-gray-700">
                  <p className="flex items-center gap-3">
                    <Calendar className="text-blue-600" size={20} />
                    <span>{issue.period}</span>
                  </p>
                  {issue.publication_date && (
                    <p className="flex items-center gap-3">
                      <Calendar className="text-blue-600" size={20} />
                      Published: {new Date(issue.publication_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <p className="flex items-center gap-3 pt-4 border-t">
                    <FileText className="text-blue-600" size={20} />
                    <span className="font-semibold text-blue-700">{issue.papers.length} Articles</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (!issue.papers.length) {
                      setDownloadNotice({
                        open: true,
                        title: 'Download unavailable',
                        message: 'No papers are available in this issue for download.',
                      });
                      return;
                    }

                    window.open(apiUrl(`issues/${issue.id}/bulk-download/`), '_blank', 'noopener,noreferrer');
                  }}
                  className="mt-10 w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl hover:from-green-700 hover:to-emerald-700 transition shadow-lg flex items-center justify-center gap-3 text-base"
                >
                  <Download size={22} />
                  Download Full Issue PDF
                </button>
              </div>
            </div>
          </div>

          {/* Papers List */}
          <div className="lg:col-span-2 space-y-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-8 flex items-center gap-4">
              <BookOpen size={36} className="text-blue-600" />
              Articles in this Issue
            </h2>

            {issue.papers.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 p-10 rounded-2xl text-center text-gray-700">
                No articles published in this issue yet.
              </div>
            ) : (
              issue.papers.map((paper) => (
                <article
                  key={paper.id}
                  className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300"
                >
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {paper.title}
                  </h3>

                  <p className="text-xl text-gray-700 mb-6">
                    <strong>Authors:</strong> {paper.authors}
                  </p>

                  {/* Updated Abstract Section with Expand/Collapse */}
                  <p className="text-gray-600 mb-8">
                    {expandedAbstracts.has(paper.id) ? (
                      <>
                        {paper.abstract}{' '}
                        <button
                          onClick={() => toggleAbstract(paper.id)}
                          className="text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          Show Less
                        </button>
                      </>
                    ) : (
                      <>
                        {truncateAbstract(paper.abstract)}{' '}
                        {paper.abstract.length > 300 && (
                          <button
                            onClick={() => toggleAbstract(paper.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium underline"
                          >
                            Read More
                          </button>
                        )}
                      </>
                    )}
                  </p>

                  <div className="flex flex-wrap gap-6 text-gray-600 mb-10">
                    <span className="flex items-center gap-2">
                      <FileText size={18} /> Pages: {paper.pages}
                    </span>
                    {paper.doi && (
                      <span className="flex items-center gap-2">
                        DOI: <Link href={`https://doi.org/${paper.doi}`} target="_blank" className="text-blue-600 hover:underline">{paper.doi}</Link>
                      </span>
                    )}
                    <span className="flex items-center gap-2">
                      <Eye size={18} /> {paper.views.toLocaleString()} views
                    </span>
                    <span className="flex items-center gap-2">
                      <Download size={18} /> {paper.downloads.toLocaleString()} downloads
                    </span>
                  </div>

                  {/* Citation & Sharing Section */}
                  <div className="border-t border-gray-200 pt-8 mb-8">
                    <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">Cite this article</label>
                        <select
                          value={citationFormat[paper.id] || 'APA'}
                          onChange={(e) => setCitationFormat(prev => ({ ...prev, [paper.id]: e.target.value }))}
                          className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-200"
                        >
                          <option value="APA">APA</option>
                          <option value="MLA">MLA</option>
                          <option value="Chicago">Chicago</option>
                          <option value="BibTeX">BibTeX</option>
                        </select>

                        <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-5 text-sm whitespace-pre-line text-slate-800">
                          {formatPaperCitation(paper, citationFormat[paper.id] || 'APA')}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 items-start">
                        <button
                          onClick={() => handleCopyCitation(paper)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-700 transition"
                        >
                          <Copy size={16} /> Copy Citation
                        </button>

                        <details className="relative inline-block">
                          <summary className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                            <Share2 size={16} /> Share
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-48 rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">
                            <button
                              onClick={() => handleShare(paper, 'twitter')}
                              className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
                            >
                              <Share2 size={16} /> Twitter
                            </button>
                            <button
                              onClick={() => handleShare(paper, 'linkedin')}
                              className="mt-2 flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
                            >
                              <Share2 size={16} /> LinkedIn
                            </button>
                            <button
                              onClick={() => handleShare(paper, 'facebook')}
                              className="mt-2 flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
                            >
                              <Share2 size={16} /> Facebook
                            </button>
                          </div>
                        </details>

                        <button
                          onClick={() => handleShare(paper, 'email')}
                          className="inline-flex items-center gap-2 rounded-2xl border border-blue-600 px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition"
                        >
                          <Mail size={16} /> Email
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked disabled className="h-4 w-4" />
                        <span className="text-sm text-gray-700">Paper</span>
                      </div>

                      {issue.cover_image && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`cover-${paper.id}`}
                            checked={downloadOptions[paper.id]?.include_cover ?? false}
                            onChange={(e) => setDownloadOptions(prev => ({
                              ...prev,
                              [paper.id]: { ...prev[paper.id], include_cover: e.target.checked }
                            }))}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor={`cover-${paper.id}`} className="text-sm text-gray-700 cursor-pointer">Cover</label>
                        </div>
                      )}

                      {issue.introductory_file && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`intro-${paper.id}`}
                            checked={downloadOptions[paper.id]?.include_intro ?? false}
                            onChange={(e) => setDownloadOptions(prev => ({
                              ...prev,
                              [paper.id]: { ...prev[paper.id], include_intro: e.target.checked }
                            }))}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor={`intro-${paper.id}`} className="text-sm text-gray-700 cursor-pointer">Intro File</label>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCustomDownload(paper)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition shadow-md flex items-center gap-2 font-medium"
                    >
                      <Download size={20} /> Download PDF
                    </button>

                    <button
                      onClick={() => handleReadMore(paper)}
                      className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-2xl hover:bg-blue-50 transition flex items-center gap-2 font-medium"
                    >
                      <Eye size={20} /> Read Full Paper
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}