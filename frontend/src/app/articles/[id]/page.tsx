// src/app/articles/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Download, Eye, ChevronRight, Share2, Copy, Mail, 
  Twitter, Linkedin, Facebook, Link as LinkIcon, 
  BookOpen, Quote, FileText, Calendar, Globe,
  ChevronDown, Check, X, MessageCircle, Send, ExternalLink
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import Image from 'next/image';

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
  issue_number?: number;
  issue_period?: string;
  issue_publication_date?: string | null;
  issue_cover_image?: string | null;
  volume_number?: number;
  volume_year?: number;
}

type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'Vancouver' | 'IEEE' | 'BibTeX' | 'RIS';

export default function ArticleDetailPage() {
  const { id } = useParams();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCitationMenu, setShowCitationMenu] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const resolveFileUrl = (filePath?: string | null) => {
    if (!filePath) return '#';
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('//')) {
      return filePath;
    }
    let clean = filePath.replace(/^\/+/, '');
    if (!clean.startsWith('media/')) {
      clean = `media/${clean}`;
    }
    let baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://rri.websoftbd.net/api';
    baseUrl = baseUrl.replace(/\/api\/?$/, '');
    return `${baseUrl.replace(/\/$/, '')}/${clean}`;
  };

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const res = await fetch(apiUrl(`public/papers/${id}/`));
        if (!res.ok) throw new Error('Failed to load paper');
        const data = await res.json();
        setPaper(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchPaper();
  }, [id]);

  const handleDownload = () => {
    if (!paper?.file) return;
    fetch(apiUrl(`papers/${paper.id}/increment-download/`), { method: 'POST' }).catch(console.error);
    window.open(resolveFileUrl(paper.file), '_blank');
  };

  const handleReadOnline = () => {
    if (!paper?.file) return;
    // Open PDF in a new tab with proper viewer
    window.open(resolveFileUrl(paper.file), '_blank');
  };

  // Extended citation formatter with more styles
  const formatCitation = (paper: Paper, style: CitationStyle): string => {
    const year = paper.issue_publication_date 
      ? new Date(paper.issue_publication_date).getFullYear() 
      : paper.volume_year || new Date().getFullYear();
    const journalName = 'Research Review International';
    const volumeNumber = paper.volume_number ?? 'n/a';
    const issueNumber = paper.issue_number ?? 'n/a';
    const pages = paper.pages || 'n.p.';
    const doiUrl = paper.doi ? `https://doi.org/${paper.doi}` : '';
    const authors = paper.authors;
    const title = paper.title;

    switch (style) {
      case 'APA':
        return `${authors} (${year}). ${title}. ${journalName}, ${volumeNumber}(${issueNumber}), ${pages}.${doiUrl ? ` ${doiUrl}` : ''}`;

      case 'MLA':
        return `${authors}. "${title}." ${journalName}, vol. ${volumeNumber}, no. ${issueNumber}, ${year}, pp. ${pages}.${doiUrl ? ` ${doiUrl}` : ''}`;

      case 'Chicago':
        return `${authors}. "${title}." ${journalName} ${volumeNumber}, no. ${issueNumber} (${year}): ${pages}.${doiUrl ? ` ${doiUrl}` : ''}`;

      case 'Harvard':
        return `${authors}, ${year}. ${title}. ${journalName}, ${volumeNumber}(${issueNumber}), pp.${pages}.${doiUrl ? ` Available at: ${doiUrl}` : ''}`;

      case 'Vancouver':
        return `${authors}. ${title}. ${journalName}. ${year};${volumeNumber}(${issueNumber}):${pages}.${doiUrl ? ` doi: ${paper.doi}` : ''}`;

      case 'IEEE':
        return `${authors}, "${title}," ${journalName}, vol. ${volumeNumber}, no. ${issueNumber}, pp. ${pages}, ${year}.${doiUrl ? ` doi: ${paper.doi}` : ''}`;

      case 'BibTeX':
        return `@article{${paper.id},
  author = {${authors}},
  title = {${title}},
  journal = {${journalName}},
  volume = {${volumeNumber}},
  number = {${issueNumber}},
  pages = {${pages}},
  year = {${year}},
  doi = {${paper.doi || ''}}
}`;

      case 'RIS':
        return `TY  - JOUR
AU  - ${authors}
TI  - ${title}
JO  - ${journalName}
VL  - ${volumeNumber}
IS  - ${issueNumber}
SP  - ${pages.split('-')[0] || pages}
EP  - ${pages.split('-')[1] || pages}
PY  - ${year}
DO  - ${paper.doi || ''}
ER  -`;

      default:
        return `${authors} (${year}). ${title}. ${journalName}, ${volumeNumber}(${issueNumber}), ${pages}.`;
    }
  };

  const handleCopyCitation = async () => {
    if (!paper) return;
    const citation = formatCitation(paper, citationStyle);
    try {
      await navigator.clipboard.writeText(citation);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2000);
    } catch (err) {
      prompt('Copy this citation manually:', citation);
    }
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      prompt('Copy this URL manually:', url);
    }
  };

  const getShareUrls = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(paper?.title || '');
    const authors = encodeURIComponent(paper?.authors || '');
    const text = encodeURIComponent(`Check out this article: ${paper?.title} by ${paper?.authors}`);

    return {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      reddit: `https://reddit.com/submit?url=${url}&title=${title}`,
      email: `mailto:?subject=${title}&body=${text}%0A%0A${url}`,
      bluesky: `https://bsky.app/intent/compose?text=${text}%20${url}`,
      mastodon: `https://toot.kyoto/?text=${text}%20${url}`,
      threads: `https://www.threads.net/intent/post?text=${text}%20${url}`,
    };
  };

  const handleShare = (platform: keyof ReturnType<typeof getShareUrls>) => {
    const shareUrls = getShareUrls();
    window.open(shareUrls[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const resolveMediaUrl = (filePath?: string | null) => {
    if (!filePath) return '/images/issues/default-cover.jpg';
    let baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://rri.websoftbd.net/api';
    baseUrl = baseUrl.replace(/\/api\/?$/, '');
    return `${baseUrl.replace(/\/$/, '')}/${filePath.replace(/^\/+/, '')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-md bg-white p-10 rounded-2xl shadow-xl">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Article Not Found</h2>
          <p className="text-gray-600 mb-8">{error || 'This article could not be loaded.'}</p>
          <Link href="/issues/current" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
            Back to Current Issue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="text-sm text-gray-300 mb-4">
            Research Review International • Volume {paper.volume_number}, Issue {paper.issue_number}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{paper.title}</h1>
          <div className="text-xl text-gray-200 mb-4">{paper.authors}</div>
          <div className="flex flex-wrap gap-6 text-sm text-gray-300 mb-8">
            <span className="flex items-center gap-2"><Eye size={16} /> {paper.views.toLocaleString()} views</span>
            <span className="flex items-center gap-2"><Download size={16} /> {paper.downloads.toLocaleString()} downloads</span>
            {paper.doi && <span className="flex items-center gap-2"><Globe size={16} /> DOI: {paper.doi}</span>}
          </div>
          
          {/* Action Buttons - Download PDF & Read Online side by side */}
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleDownload} 
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 font-medium"
            >
              <Download size={18} />
              Download PDF
            </button>
            <button 
              onClick={handleReadOnline} 
              className="px-6 py-3 border border-white text-white rounded-lg hover:bg-white/10 transition flex items-center gap-2 font-medium"
            >
              <ExternalLink size={18} />
              Read Online
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_320px] gap-12">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Abstract */}
            <div className="bg-gray-50 p-6 rounded-xl border-l-4 border-blue-500">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Quote size={18} className="text-blue-500" />
                Abstract
              </h2>
              <p className="text-gray-700 leading-relaxed">{paper.abstract}</p>
              {paper.keywords && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <span className="font-semibold text-sm text-gray-600">Keywords: </span>
                  <span className="text-gray-500 text-sm">{paper.keywords}</span>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={32} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Full Article Access</h3>
                  <p className="text-gray-500 text-sm mb-3">Complete PDF with all figures, tables, and references • {paper.pages} pages</p>
                  <p className="text-sm text-gray-600">The full article PDF is displayed below for immediate reading.</p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Full PDF Viewer</span>
              </div>
              <embed src={resolveFileUrl(paper.file)} type="application/pdf" className="w-full h-[900px]" />
            </div>
          </div>

          {/* Right Sidebar - Enhanced with More Options */}
          <div className="space-y-6">
            {/* Article Info */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText size={16} />
                Article Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Volume:</span>
                  <span className="text-gray-900 font-medium">{paper.volume_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Issue:</span>
                  <span className="text-gray-900 font-medium">{paper.issue_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pages:</span>
                  <span className="text-gray-900 font-medium">{paper.pages}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Period:</span>
                  <span className="text-gray-900 font-medium">{paper.issue_period}</span>
                </div>
                {paper.issue_publication_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Published:</span>
                    <span className="text-gray-900 font-medium">
                      {new Date(paper.issue_publication_date).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Citation Dropdown - Enhanced */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen size={16} />
                Cite This Article
              </h3>
              
              <div className="relative mb-3">
                <button
                  onClick={() => setShowCitationMenu(!showCitationMenu)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-blue-400 transition"
                >
                  <span>{citationStyle}</span>
                  <ChevronDown size={16} className={`transition-transform ${showCitationMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showCitationMenu && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {(['APA', 'MLA', 'Chicago', 'Harvard', 'Vancouver', 'IEEE', 'BibTeX', 'RIS'] as CitationStyle[]).map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          setCitationStyle(style);
                          setShowCitationMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition"
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200 mb-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono break-words">
                  {formatCitation(paper, citationStyle)}
                </pre>
              </div>
              
              <button
                onClick={handleCopyCitation}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition text-sm"
              >
                {copiedCitation ? <Check size={16} /> : <Copy size={16} />}
                {copiedCitation ? 'Copied!' : 'Copy Citation'}
              </button>
            </div>

            {/* Share Options - Enhanced with more platforms */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Share2 size={16} />
                Share This Article
              </h3>
              
              <div className="space-y-3">
                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  {copiedLink ? <Check size={16} /> : <LinkIcon size={16} />}
                  {copiedLink ? 'Link Copied!' : 'Copy Article Link'}
                </button>
                
                {/* Social Media Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleShare('twitter')}
                    className="flex flex-col items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-black hover:text-white hover:border-black transition group"
                  >
                    <Twitter size={18} className="group-hover:text-white" />
                    <span className="text-xs text-gray-600 group-hover:text-white">X</span>
                  </button>
                  
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="flex flex-col items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-700 hover:text-white hover:border-blue-700 transition group"
                  >
                    <Linkedin size={18} className="group-hover:text-white" />
                    <span className="text-xs text-gray-600 group-hover:text-white">LinkedIn</span>
                  </button>
                  
                  <button
                    onClick={() => handleShare('facebook')}
                    className="flex flex-col items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition group"
                  >
                    <Facebook size={18} className="group-hover:text-white" />
                    <span className="text-xs text-gray-600 group-hover:text-white">FB</span>
                  </button>
                  
                  <button
                    onClick={() => handleShare('whatsapp')}
                    className="flex flex-col items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-green-500 hover:text-white hover:border-green-500 transition group"
                  >
                    <MessageCircle size={18} className="group-hover:text-white" />
                    <span className="text-xs text-gray-600 group-hover:text-white">WA</span>
                  </button>
                  
                  <button
                    onClick={() => handleShare('telegram')}
                    className="flex flex-col items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-500 hover:text-white hover:border-blue-500 transition group"
                  >
                    <Send size={18} className="group-hover:text-white" />
                    <span className="text-xs text-gray-600 group-hover:text-white">TG</span>
                  </button>
                  
                  <button
                    onClick={() => handleShare('reddit')}
                    className="flex flex-col items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-orange-500 hover:text-white hover:border-orange-500 transition group"
                  >
                    <svg className="w-4 h-4 group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.523 3.755 10.136 8.889 11.502.65.12.889-.283.889-.63 0-.312-.012-1.361-.018-2.466-3.617.786-4.38-1.532-4.38-1.532-.59-1.5-1.44-1.9-1.44-1.9-1.178-.805.089-.789.089-.789 1.302.092 1.986 1.339 1.986 1.339 1.157 1.984 3.036 1.411 3.778 1.079.118-.84.453-1.411.823-1.735-2.879-.327-5.904-1.44-5.904-6.41 0-1.416.506-2.573 1.334-3.48-.134-.327-.579-1.645.127-3.43 0 0 1.085-.346 3.556 1.33 1.032-.287 2.14-.43 3.24-.435 1.1.005 2.208.148 3.24.435 2.471-1.676 3.556-1.33 3.556-1.33.706 1.785.261 3.103.127 3.43.828.907 1.334 2.064 1.334 3.48 0 4.98-3.03 6.075-5.916 6.395.465.4.88 1.19.88 2.4 0 1.733-.016 3.13-.016 3.555 0 .347.239.75.895.63C20.245 22.136 24 17.523 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span className="text-xs text-gray-600 group-hover:text-white">Reddit</span>
                  </button>
                </div>
                
                {/* Email Option */}
                <button
                  onClick={() => handleShare('email')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  <Mail size={16} />
                  Share via Email
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-3">Article Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Views</span>
                  <span className="text-2xl font-bold text-blue-600">{paper.views.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Downloads</span>
                  <span className="text-2xl font-bold text-green-600">{paper.downloads.toLocaleString()}</span>
                </div>
                {paper.doi && (
                  <div className="pt-2 border-t border-blue-100">
                    <a 
                      href={`https://doi.org/${paper.doi}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Globe size={14} />
                      View on DOI.org
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}