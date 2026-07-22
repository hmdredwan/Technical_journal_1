'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiUrl } from '@/utils/api';
import Image from 'next/image';

interface CallForPaperAdvertize {
  id: number;
  file: string;
  file_type: 'pdf' | 'image';
  title: string;
  description: string;
  is_active: boolean;
  inactive_after: string | null;
}

export default function CallForPaperModal() {
  const [advertisement, setAdvertisement] = useState<CallForPaperAdvertize | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdvertisement = async () => {
      try {
        const res = await fetch(apiUrl('call-for-paper-advertize/public/'));
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        const ads = Array.isArray(data) ? data : [data];
        if (ads.length > 0) {
          setAdvertisement(ads[0]);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Failed to fetch call for paper advertisement:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvertisement();
  }, []);

  if (loading || !advertisement || !isOpen) return null;

  const fileUrl = advertisement.file.startsWith('http') 
    ? advertisement.file 
    : `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, '') || 'https://rri.websoftbd.net'}${advertisement.file}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 
                    bg-black/70 backdrop-blur-md">
      
      <div className="relative max-w-4xl w-full max-h-[90vh] bg-transparent">
        
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute -top-4 -right-4 z-20 p-3 bg-white rounded-full shadow-xl hover:bg-gray-100 transition-all duration-200 hover:scale-110 border border-gray-200"
        >
          <X size={28} className="text-gray-700" />
        </button>

        {/* Modal Content */}
        <div className="w-full h-full flex items-center justify-center">
          {advertisement.file_type === 'pdf' ? (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full h-[80vh] md:h-[85vh]">
              <iframe
                src={fileUrl}
                className="w-full h-full border-0"
                title={advertisement.title || 'Call for Papers'}
                allowFullScreen
              />
            </div>
          ) : (
            <div className="relative w-full max-w-3xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
              <Image
                src={fileUrl}
                alt={advertisement.title || 'Call for Papers Advertisement'}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 80vw"
                priority
                onError={(e) => {
                  console.error('Image failed to load:', fileUrl);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}