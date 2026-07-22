// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Menu, X, BookOpen, Search, FileText, Calendar, ChevronRight, Newspaper
} from 'lucide-react';

import { apiUrl } from '@/utils/api';
import CallForPaperModal from '@/components/CallForPaperModal';

type HeroSlide = {
  id: number | string;
  image: string;
  alt_text?: string;
  link_url?: string | null;
};

type PublicPaper = {
  id: number;
  title: string;
  authors?: string;
  keywords?: string;
  doi?: string;
  abstract?: string;
  views?: number;
  downloads?: number;
  created_at?: string;
};

type CurrentIssue = {
  id: number;
  number: number;
  period?: string;
  publication_date?: string;
  volume?: {
    number: number;
    year: number;
    title?: string;
  } | number;
};

type NewsItem = {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  published_at: string;
};

type ImportantDateItem = {
  id: number;
  title: string;
  date: string;
  description?: string;
};

const heroImagesFallback: HeroSlide[] = [
  { id: 'fallback-0', image: '/hero/hero6.jpg' },
  { id: 'fallback-1', image: '/hero/hero2.jpg' },
  { id: 'fallback-2', image: '/hero/hero3.jpg' },
  { id: 'fallback-3', image: '/hero/hero4.jpg' },
];

export default function Home() {
  const router = useRouter();
  const [currentHero, setCurrentHero] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(heroImagesFallback);
  const [failedImageIds, setFailedImageIds] = useState<Record<string | number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicPaper[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<CurrentIssue | null>(null);
  const [featuredPapers, setFeaturedPapers] = useState<PublicPaper[]>([]);
  const [recentPapers, setRecentPapers] = useState<PublicPaper[]>([]);
  const [mostViewed, setMostViewed] = useState<PublicPaper[]>([]);
  const [mostDownloaded, setMostDownloaded] = useState<PublicPaper[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDateItem[]>([]);

  const formatDMY = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  // Load active hero slides from backend
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(apiUrl('hero-images/public/'));
        const data = await res.json().catch(() => null);
        if (!res.ok) return;

        const list = Array.isArray(data) ? data : data?.results || [];
        if (!cancelled && list.length > 0) {
          const normalized = list.map((s: any) => ({
            id: s.id,
            image: s.image,
            alt_text: s.alt_text,
            link_url: s.link_url,
          }));
          setHeroSlides(normalized);
        }
      } catch {
        // Keep fallback slides on errors
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Quick paper search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearched(false);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearched(true);
        const res = await fetch(apiUrl('public/papers/'));
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setSearchResults([]);
          return;
        }

        const papers: PublicPaper[] = Array.isArray(data) ? data : data?.results || [];
        const qq = q.toLowerCase();
        const filtered = papers
          .filter((p) => {
            const title = (p.title || '').toLowerCase();
            const authors = (p.authors || '').toLowerCase();
            const keywords = (p.keywords || '').toLowerCase();
            const doi = (p.doi || '').toLowerCase();
            return (
              title.includes(qq) ||
              authors.includes(qq) ||
              keywords.includes(qq) ||
              doi.includes(qq)
            );
          })
          .slice(0, 8);
        setSearchResults(filtered);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const goToPaper = (paperId: number) => {
    router.push(`/articles/${paperId}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (searchResults.length > 0) {
      goToPaper(searchResults[0].id);
    } else {
      router.push('/issues/current');
    }
  };

  // Auto slide hero images
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  useEffect(() => {
    // Keep current index in range when slides change
    if (heroSlides.length === 0) return;
    setCurrentHero((prev) => prev % heroSlides.length);
  }, [heroSlides.length]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.mobile-menu-container')) {
          setIsMobileMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
  // Dynamic homepage data: current issue, papers, news
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const issueRes = await fetch(apiUrl('issues/current/'));
        const issueData = await issueRes.json().catch(() => null);
        if (issueRes.ok && issueData && !cancelled) {
          setCurrentIssue(issueData);
          if (issueData.id) {
            const featuredRes = await fetch(apiUrl(`public/papers/?issue=${issueData.id}`));
            const featuredData = await featuredRes.json().catch(() => null);
            if (featuredRes.ok && !cancelled) {
              const list: PublicPaper[] = Array.isArray(featuredData) ? featuredData : featuredData?.results || [];
              setFeaturedPapers(list.slice(0, 3));
            }
          }
        }
      } catch {
        // keep empty fallback
      }

      try {
        const papersRes = await fetch(apiUrl('public/papers/'));
        const papersData = await papersRes.json().catch(() => null);
        if (papersRes.ok && !cancelled) {
          const list: PublicPaper[] = Array.isArray(papersData) ? papersData : papersData?.results || [];
          const sorted = [...list].sort((a, b) => {
            const aa = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bb - aa;
          });
          setRecentPapers(sorted.slice(0, 4));
          // Compute most viewed and most downloaded locally if the API doesn't provide dedicated endpoints
          const byViews = [...list]
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 4);
          const byDownloads = [...list]
            .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
            .slice(0, 4);
          setMostViewed(byViews);
          setMostDownloaded(byDownloads);
        }
      } catch {
        // ignore
      }

      try {
        const newsRes = await fetch(apiUrl('news/public/'));
        const newsData = await newsRes.json().catch(() => null);
        if (newsRes.ok && !cancelled) {
          const list: NewsItem[] = Array.isArray(newsData) ? newsData : newsData?.results || [];
          setNewsItems(list.slice(0, 6));
        }
      } catch {
        // ignore
      }

      try {
        const datesRes = await fetch(apiUrl('important-dates/public/'));
        const datesData = await datesRes.json().catch(() => null);
        if (datesRes.ok && !cancelled) {
          const list: ImportantDateItem[] = Array.isArray(datesData) ? datesData : datesData?.results || [];
          setImportantDates(list.slice(0, 6));
        }
      } catch {
        // ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <CallForPaperModal />

      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden group">
        {heroSlides.map((slide, index) => {
          const isActiveSlide = index === currentHero;
          const slideClasses = `absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActiveSlide ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`;
          const slideAltText = slide.alt_text?.trim() || `Hero slide ${index + 1}`;
          const imageFailed = Boolean(failedImageIds[slide.id]);
          const shouldShowFallback = imageFailed || !slide.image;

          const handleImageError = () => {
            setFailedImageIds((prev) => ({ ...prev, [slide.id]: true }));
          };

          const slideBody = (
            <>
              {shouldShowFallback ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 px-6 text-center">
                  <div className="max-w-xl rounded-2xl border border-white/10 bg-black/30 px-6 py-8 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.35em] text-white/70">Featured image</p>
                    <p className="mt-3 text-xl font-semibold text-white sm:text-2xl">{slideAltText}</p>
                  </div>
                </div>
              ) : (
                <img
                  src={slide.image}
                  alt={slideAltText}
                  onError={handleImageError}
                  className={`absolute inset-0 h-full w-full object-cover transform scale-105 transition-transform duration-[12000ms] ${isActiveSlide && slide.link_url ? 'hover:scale-110' : ''}`}
                  style={{
                    animation: isActiveSlide ? 'kenburns 12s infinite' : 'none',
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 opacity-0 hover:opacity-90 transition-opacity duration-300 pointer-events-none">
                <p className="text-gray-100 text-center px-4 text-lg font-medium">{slideAltText}</p>
              </div>

              {slide.link_url && isActiveSlide && (
                <a
                  href={slide.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-6 right-6 z-20 inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg transition-all duration-200 transform hover:bg-white hover:scale-105 text-sm font-semibold text-gray-800"
                  title={`Click to visit: ${slide.alt_text || 'link'}`}
                >
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Visit link
                </a>
              )}
            </>
          );

          return (
            <div key={slide.id} className={slideClasses}>
              {slideBody}
            </div>
          );
        })}

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-3xl animate-fade-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6 drop-shadow-lg leading-tight">
              Advancing Knowledge Through Excellence
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-100 mb-10 drop-shadow-md max-w-2xl">
              A leading peer-reviewed open access journal committed to publishing high-quality research with global impact
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <Link
                href="/submit"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-700 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all duration-300 text-base lg:text-lg"
              >
                Submit Your Manuscript
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/issues/current"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/15 backdrop-blur-sm transition-all duration-300 transform hover:-translate-y-1 text-base lg:text-lg"
              >
                Explore Latest Issue
              </Link>
            </div>
          </div>
        </div>

        {/* Slider Controls */}
        <button
          onClick={() =>
            setCurrentHero((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
          }
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white opacity-0 group-hover:opacity-80 hover:opacity-100 hover:bg-black/50 transition-all duration-300 transform hover:scale-110 shadow-lg"
          aria-label="Previous slide"
        >
          <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => setCurrentHero((prev) => (prev + 1) % heroSlides.length)}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white opacity-0 group-hover:opacity-80 hover:opacity-100 hover:bg-black/50 transition-all duration-300 transform hover:scale-110 shadow-lg"
          aria-label="Next slide"
        >
          <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-4 z-10">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentHero(index)}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                index === currentHero ? 'bg-white scale-125 shadow-lg' : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 -mt-12 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
          <div className="flex items-center gap-4 mb-5">
            <Search className="h-7 w-7 text-blue-600" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Search Articles</h2>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, keywords, DOI..."
                className="flex-1 px-5 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-10 py-4 rounded-xl font-medium hover:bg-blue-700 transition-all duration-300 text-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Search
              </button>
            </div>

            {searchQuery.trim() ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-600">Searching papers...</div>
                ) : searchResults.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {searchResults.map((paper) => (
                      <li key={paper.id}>
                        <button
                          type="button"
                          onClick={() => goToPaper(paper.id)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition"
                        >
                          <p className="font-medium text-gray-900">{paper.title}</p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                            {paper.authors ? `Authors: ${paper.authors}` : 'Authors info unavailable'}
                            {paper.doi ? ` • DOI: ${paper.doi}` : ''}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : searched ? (
                  <div className="px-4 py-3 text-sm text-gray-600">
                    No matching paper found. Press Search to browse current issue.
                  </div>
                ) : null}
              </div>
            ) : null}
          </form>

          <div className="mt-5 text-sm text-gray-600 flex flex-wrap gap-6">
            <span className="hover:text-blue-600 cursor-pointer">Advanced Search</span>
            <span>•</span>
            <span className="hover:text-blue-600 cursor-pointer">Browse by Subject</span>
            <span>•</span>
            <span className="hover:text-blue-600 cursor-pointer">By Volume / Issue</span>
          </div>
        </div>
      </section>

      {/* Latest Issue + Featured Articles */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Current Issue Card */}
          <div className="md:col-span-1 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-6 w-6" />
                <h3 className="text-xl font-bold">Current Issue</h3>
              </div>
              <p className="text-lg opacity-90">
                {currentIssue
                  ? `Volume ${
                      typeof currentIssue.volume === 'object' ? currentIssue.volume?.number : currentIssue.volume || '-'
                    } • Issue ${currentIssue.number}${currentIssue.period ? ` • ${currentIssue.period}` : ''}`
                  : 'Loading current issue...'}
              </p>
            </div>

            <div className="p-6">
              <h4 className="font-semibold text-lg mb-3">Featured Articles</h4>
              <ul className="space-y-3">
                {featuredPapers.length > 0 ? (
                  featuredPapers.map((paper) => (
                    <li key={paper.id} className="text-gray-700 hover:text-blue-600 transition">
                      <Link href={`/articles/${paper.id}`}>• {paper.title}</Link>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No featured papers available.</li>
                )}
              </ul>
              <Link href="/issues/current" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800">
                View All Articles →
              </Link>
            </div>
          </div>

          {/* Recent Articles + Important Dates */}
          <div className="md:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                Recently Published
              </h2>

              <div className="grid sm:grid-cols-2 gap-6">
                {recentPapers.length > 0 ? (
                  recentPapers.map((item) => (
                    <Link
                      key={item.id}
                      href={`/articles/${item.id}`}
                      className="bg-white p-5 rounded-lg border border-gray-100 hover:shadow-md transition block"
                    >
                      <h4 className="font-medium mb-2 line-clamp-2">{item.title}</h4>
                      <p className="text-sm text-gray-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently published'}
                      </p>
                      {item.abstract ? (
                        <p className="text-sm text-gray-700 mt-3 line-clamp-3">{item.abstract}</p>
                      ) : null}
                      <div className="mt-4">
                        <span className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
                          Read full →
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-gray-500 col-span-2">No recent papers found.</div>
                )}
              </div>
            </div>
                    {/* Important Dates    */}
            <div className="bg-indigo-50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Important Dates
              </h3>
              <ul className="space-y-3 text-gray-700">
                {importantDates.length > 0 ? (
                  importantDates.map((d) => (
                    <li key={d.id}>
                      • <span className="font-medium">{d.title}</span>: {formatDMY(d.date)}
                      {d.description ? ` — ${d.description}` : ''}
                    </li>
                  ))
                ) : (
                  <li>• No important dates available.</li>
                )}
              </ul>
            </div>
              {/* end Important Dates column content */}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1">
            <div className="bg-gradient-to-r from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold">Most Viewed</h4>
                  <p className="text-sm text-gray-500">Top papers by views</p>
                </div>
              </div>
              <ul className="space-y-3">
                {mostViewed.length > 0 ? (
                  mostViewed.map((p) => (
                    <li key={p.id} className="bg-white p-3 rounded-lg border border-gray-100 hover:shadow-md transition">
                      <Link href={`/articles/${p.id}`} className="block">
                        <h5 className="font-medium text-gray-900 line-clamp-2">{p.title}</h5>
                        {p.abstract ? <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.abstract}</p> : null}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No data available.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-gradient-to-r from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold">Most Downloaded</h4>
                  <p className="text-sm text-gray-500">Top papers by downloads</p>
                </div>
              </div>
              <ul className="space-y-3">
                {mostDownloaded.length > 0 ? (
                  mostDownloaded.map((p) => (
                    <li key={p.id} className="bg-white p-3 rounded-lg border border-gray-100 hover:shadow-md transition">
                      <Link href={`/articles/${p.id}`} className="block">
                        <h5 className="font-medium text-gray-900 line-clamp-2">{p.title}</h5>
                        {p.abstract ? <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.abstract}</p> : null}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No data available.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────── */}
      {/*               N E W   N E W S   S E C T I O N     */}
      {/* ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16 bg-white">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <Newspaper className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              News & Announcements
            </h2>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Stay updated with the latest journal news, calls for papers, events, and achievements
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {newsItems.map((news) => (
            <div 
              key={news.id}
              className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(news.published_at).toLocaleDateString()}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                  {news.title}
                </h3>
                <p className="text-gray-700 mb-6 line-clamp-3">
                  {news.excerpt || news.content}
                </p>
                <Link
                  href={`/news/${news.id}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  Read More →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/news"
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
          >
            View All News & Announcements
            <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
