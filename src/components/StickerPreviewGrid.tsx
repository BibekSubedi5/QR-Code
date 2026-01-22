'use client';

/**
 * A4 Sticker Preview Grid - Template-Based
 * 
 * Shows a preview that mimics the actual template design:
 * - Dark blue sticker card with "PAY HERE" header
 * - Small QR code in the "SCAN QR CODE" section
 * - URL in the "VISIT WEBSITE" section
 * - Tangerpay branding
 */

import Image from 'next/image';
import { useMemo } from 'react';

// Helper function to extract display text from URL
function extractDisplayText(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.slice(0, 30);
  }
}

interface StickerPreviewGridProps {
  urls: string[];
  totalSlots: number;
  showUrlText?: boolean;
}

// Single sticker card component matching the template design
function StickerCard({ qrUrl, displayText }: { qrUrl: string; displayText: string }) {
  return (
    <div 
      className="relative w-full h-full rounded-lg overflow-hidden flex flex-col"
      style={{ 
        backgroundColor: '#3d4f5f',
        padding: '4%',
      }}
    >
      {/* PAY HERE header */}
      <div className="text-white font-bold text-center" style={{ fontSize: 'clamp(6px, 2vw, 14px)' }}>
        PAY HERE
      </div>
      
      {/* SCAN QR CODE section */}
      <div className="flex items-center justify-center gap-1 mt-1" style={{ flex: '0 0 auto' }}>
        <div className="flex items-center gap-1">
          <span 
            className="bg-blue-500 text-white rounded-full flex items-center justify-center"
            style={{ width: 'clamp(8px, 1.5vw, 12px)', height: 'clamp(8px, 1.5vw, 12px)', fontSize: 'clamp(4px, 1vw, 8px)' }}
          >
            A
          </span>
          <span className="text-white" style={{ fontSize: 'clamp(4px, 1.2vw, 9px)' }}>
            SCAN QR CODE
          </span>
        </div>
        {/* Small QR Code */}
        <div 
          className="relative bg-white rounded"
          style={{ 
            width: 'clamp(20px, 5vw, 40px)', 
            height: 'clamp(20px, 5vw, 40px)',
            padding: '2px'
          }}
        >
          <Image
            src={qrUrl}
            alt="QR Code"
            fill
            className="object-contain p-0.5"
            unoptimized
          />
        </div>
      </div>
      
      {/* VISIT WEBSITE section */}
      <div className="mt-1 flex items-center gap-1">
        <span 
          className="bg-gray-400 text-white rounded-full flex items-center justify-center"
          style={{ width: 'clamp(8px, 1.5vw, 12px)', height: 'clamp(8px, 1.5vw, 12px)', fontSize: 'clamp(4px, 1vw, 8px)' }}
        >
          B
        </span>
        <div className="flex flex-col">
          <span className="text-white font-semibold" style={{ fontSize: 'clamp(4px, 1.2vw, 9px)' }}>
            VISIT WEBSITE
          </span>
          <span className="text-yellow-300" style={{ fontSize: 'clamp(3px, 1vw, 7px)' }}>
            {displayText}
          </span>
        </div>
      </div>
      
      {/* Tangerpay branding */}
      <div className="mt-auto text-center">
        <span className="text-gray-300" style={{ fontSize: 'clamp(3px, 0.8vw, 6px)' }}>
          ⚡ Tangerpay
        </span>
      </div>
    </div>
  );
}

export function StickerPreviewGrid({
  urls,
  totalSlots,
  showUrlText = true,
}: StickerPreviewGridProps) {
  // Generate preview items (repeat URL to fill 12 slots)
  const previewItems = useMemo(() => {
    if (urls.length === 0) return [];
    
    const items: { url: string; displayText: string }[] = [];
    for (let i = 0; i < totalSlots; i++) {
      const url = urls[i % urls.length];
      const displayText = extractDisplayText(url);
      items.push({ url, displayText });
    }
    return items;
  }, [urls, totalSlots]);

  if (urls.length === 0) {
    return (
      <div className="w-full aspect-[210/297] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
        <div className="text-center p-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
          <p className="text-gray-500 text-sm">
            Add a QR image URL to preview
          </p>
          <p className="text-gray-400 text-xs mt-1">
            3 columns × 4 rows = 12 stickers
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* A4 Preview Container matching template layout */}
      <div 
        className="w-full rounded-lg shadow-lg overflow-hidden border border-gray-200"
        style={{ 
          aspectRatio: '210 / 297',
          backgroundColor: '#f5f5f5', // Light gray page background
          padding: '2%',
        }}
      >
        {/* 3x4 Grid */}
        <div className="grid grid-cols-3 grid-rows-4 gap-1 h-full">
          {previewItems.map((item, index) => (
            <StickerCard 
              key={index} 
              qrUrl={item.url} 
              displayText={showUrlText ? item.displayText : ''} 
            />
          ))}
        </div>
      </div>

      {/* Preview Info */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
          A4 (210×297mm)
        </span>
        <span>•</span>
        <span>12 stickers</span>
        <span>•</span>
        <span className="text-green-600">Template-based</span>
      </div>
    </div>
  );
}
