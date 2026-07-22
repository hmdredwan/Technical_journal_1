'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiUrl } from '@/utils/api';

type AboutSection = {
  id: number;
  section: string;
  section_display: string;
  title: string;
  content: string;
  topics: string[];
  is_active: boolean;
  sort_order: number;
};

// Default fallback content when API is not available or returns empty
const DEFAULT_CONTENT: AboutSection[] = [
  {
    id: 0,
    section: 'mission',
    section_display: 'Mission',
    title: 'Our Mission',
    content: 'Technical Journal is dedicated to publishing high-quality, peer-reviewed research and innovative solutions for sustainable development.',
    topics: [],
    is_active: true,
    sort_order: 1,
  },
  {
    id: 0,
    section: 'vision',
    section_display: 'Vision',
    title: 'Our Vision',
    content: 'To become a leading open-access platform in South Asia and beyond for interdisciplinary research on rivers, fostering collaboration between scientists, policymakers, engineers, and communities to address pressing water-related challenges.',
    topics: [],
    is_active: true,
    sort_order: 2,
  },
  {
    id: 0,
    section: 'key_facts',
    section_display: 'Key Facts',
    title: 'Key Facts',
    content: '',
    topics: ['ISSN: 1606-9277', 'Open Access – No subscription fees for readers', 'Double-blind peer review process', 'Published biannually (June, December)'],
    is_active: true,
    sort_order: 3,
  },
  {
    id: 0,
    section: 'history',
    section_display: 'History',
    title: 'History',
    content: 'Founded to provide a dedicated platform for peer-reviewed research and innovative solutions in technical fields.',
    topics: [],
    is_active: true,
    sort_order: 4,
  },
  {
    id: 0,
    section: 'scope_topics',
    section_display: 'Scope & Topics',
    title: 'Scope & Topics',
    content: '',
    topics: [
      'River Hydrology & Hydraulics',
      'River Basin Management',
      'Climate Change & Rivers',
      'Water Quality & Pollution',
      'Sediment Transport & Morphology',
      'Flood & Drought Management',
      'River Ecology & Biodiversity',
      'Sustainable Engineering Solutions'
    ],
    is_active: true,
    sort_order: 5,
  },
  {
    id: 0,
    section: 'editorial_team',
    section_display: 'Editorial Team',
    title: 'Editorial Team',
    content: 'Our journal is supported by an international editorial board of experts from Bangladesh, India, Nepal, and other river-dependent countries, ensuring high academic standards and regional relevance.',
    topics: [],
    is_active: true,
    sort_order: 6,
  },
];

export default function AboutPage() {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const normalizeBulletLine = (line: string) =>
    line.replace(/^([-*•]|\d+[.)])\s+/, '').trim();

  const formatInlineMarkdown = (text: string) =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  const renderContent = (content: string) => {
    const rawLines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (rawLines.length === 0) return null;

    const blocks: Array<{ type: 'paragraph' | 'list'; items: string[] }> = [];
    let currentBlock: string[] = [];
    let currentType: 'paragraph' | 'list' | null = null;

    const flushBlock = () => {
      if (!currentBlock.length) return;

      const isList = currentBlock.every((line) => /^([-*•]|\d+[.)])\s+/.test(line));
      blocks.push({
        type: isList ? 'list' : 'paragraph',
        items: currentBlock,
      });
      currentBlock = [];
      currentType = null;
    };

    rawLines.forEach((line) => {
      const isListLine = /^([-*•]|\d+[.)])\s+/.test(line);

      if (currentType === null) {
        currentType = isListLine ? 'list' : 'paragraph';
        currentBlock = [line];
        return;
      }

      if (isListLine && currentType === 'list') {
        currentBlock.push(line);
        return;
      }

      if (!isListLine && currentType === 'paragraph') {
        currentBlock.push(line);
        return;
      }

      flushBlock();
      currentType = isListLine ? 'list' : 'paragraph';
      currentBlock = [line];
    });

    flushBlock();

    if (blocks.length === 0) return null;

    return (
      <div className="space-y-6 text-gray-700">
        {blocks.map((block, index) =>
          block.type === 'list' ? (
            <ul key={index} className="list-disc list-inside space-y-3">
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`} className="ml-3 leading-relaxed">
                  {normalizeBulletLine(item)}
                </li>
              ))}
            </ul>
          ) : (
            <div key={index} className="space-y-4">
              {block.items.map((item, itemIndex) => (
                <p
                  key={`${index}-${itemIndex}`}
                  className="leading-relaxed text-justify"
                  dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }}
                />
              ))}
            </div>
          )
        )}
      </div>
    );
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchAboutContent = async () => {
      try {
        const res = await fetch(apiUrl('about-page/public/'), {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch about page content');
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.results || [];
        
        if (list.length > 0) {
          setSections(list);
        } else {
          // Use default content if API returns empty
          setSections(DEFAULT_CONTENT);
        }
      } catch (err) {
        console.error('Error fetching about page content:', err);
        // Use default content on error
        setSections(DEFAULT_CONTENT);
      } finally {
        setLoading(false);
      }
    };

    fetchAboutContent();
  }, []);

  // Group sections by their position (left column vs right column)
  const leftColumnSections = sections.filter(s => 
    ['mission', 'vision', 'key_facts'].includes(s.section)
  );
  
  const rightColumnSections = sections.filter(s => 
    ['history', 'scope_topics', 'editorial_team'].includes(s.section)
  );

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <section 
        className="relative bg-cover bg-center bg-no-repeat py-20 md:py-28 text-white overflow-hidden"
        style={{
          backgroundImage: "url('/images/about-header-bg.jpg')",
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-transparent from-blue-900/80 to-indigo-900/80" />

        {/* Content - on top of overlay */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight drop-shadow-lg">
            About Technical Journal
          </h1>
          <p className="text-xl md:text-2xl opacity-95 max-w-4xl mx-auto drop-shadow-md">
            Technical Journal – Advancing knowledge through research and innovation, 
            water resources, and sustainable innovation
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12">
        {/* Left Column - Mission, Vision, Key Facts */}
<div className="space-y-10">
  {leftColumnSections
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section) => (
      <div key={section.section}>
        {section.section === 'key_facts' ? (
          <div className="bg-blue-50 p-8 rounded-xl border border-blue-100">
            <h3 className="text-2xl font-bold text-blue-800 mb-4">{section.title}</h3>
            {section.content && (
              <div className="mb-4 ">{renderContent(section.content)}</div>
            )}
            {section.topics && section.topics.length > 0 && (
              <ul className="space-y-4 text-gray-700 ">
                {section.topics.map((topic, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold text-xl">•</span>
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">{section.title}</h2>
            
            {/* 🔥 Updated: Use renderContent for Mission & Vision */}
            {section.content ? (
              renderContent(section.content)
            ) : (
              <p className="text-lg text-gray-700 leading-relaxed text-justify">
                No content available.
              </p>
            )}
          </>
        )}
      </div>
    ))}
</div>

          {/* Right Column - History, Scope & Topics, Editorial Team */}
          <div className="space-y-10">
            {rightColumnSections
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((section) => (
                <div key={section.section}>
                  {section.section === 'scope_topics' ? (
                    <>
                      <h2 className="text-3xl font-bold text-gray-700 mb-6">{section.title}</h2>
                      <div className="grid grid-cols-2 gap-4">
                        {section.topics?.map((topic, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            {topic}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : section.section === 'editorial_team' ? (
                    <>
                      <h2 className="text-3xl font-bold text-gray-800 mb-6">{section.title}</h2>
                      {renderContent(section.content)}
                      <Link 
                        href="/editorial-board" 
                        className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Meet the full editorial board →
                      </Link>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold text-gray-800 mb-6">{section.title}</h2>
                      {renderContent(section.content)}
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}