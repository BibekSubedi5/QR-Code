'use client';

import { useState } from 'react';

export default function StickerSheetPage() {
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isValidQr, setIsValidQr] = useState(false);

  const getDisplayText = (url: string): string => {
    try {
      return new URL(url).searchParams.get('data') || '';
    } catch {
      return '';
    }
  };

  const handleGenerate = async () => {
    const trimmedUrl = qrImageUrl.trim();
    
    if (!trimmedUrl) {
      setError('Please paste a QR image URL');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError('Invalid URL format');
      return;
    }

    if (!isValidQr) {
      setError('No QR code detected. Please use another link.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-stickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrImageUrl: trimmedUrl }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to generate PDF');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      if (!response.headers.get('content-type')?.includes('application/pdf')) {
        throw new Error('Server did not return a PDF');
      }

      const blob = await response.blob();
      setPreviewUrl(URL.createObjectURL(blob));
      setShowModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const closeModal = () => setShowModal(false);
  const displayText = getDisplayText(qrImageUrl);
  const downloadFilename = `stickers-${displayText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20) || 'qr'}.pdf`;

  return (
    <div className="min-h-screen bg-gradient-to-br  flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border-t-4 border-b-4 border-orange-500">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-orange-600">QR Sticker Generator</h1>
          <p className="text-gray-500 text-sm mt-1">Generate printable A4 sticker sheets</p>
        </div>

        {/* Input */}
        <div className="space-y-5">
          <div>
            <label htmlFor="qrImageUrl" className="block text-sm font-semibold text-gray-700 mb-2">
              QR Image URL
            </label>
            <textarea
              id="qrImageUrl"
              value={qrImageUrl}
              onChange={(e) => { setQrImageUrl(e.target.value); setError(''); setIsValidQr(false); }}
              placeholder="Paste your QR image URL here..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-mono text-sm transition-all resize-none"
              rows={2}
            />
          </div>

          {displayText && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-sm text-orange-800">
                <span className="font-semibold">Label:</span> {displayText}
              </p>
            </div>
          )}

          {qrImageUrl && (
            <div className="flex justify-center">
              <img
                src={qrImageUrl}
                alt="QR Preview"
                className={`w-28 h-28 border-2 rounded-xl shadow-sm ${isValidQr ? 'border-green-400' : 'border-gray-200'}`}
                onLoad={() => setIsValidQr(true)}
                onError={() => { setIsValidQr(false); setError('No QR code detected. Please use another link.'); }}
                style={{ display: isValidQr ? 'block' : 'none' }}
              />
              {!isValidQr && !error && (
                <div className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
                  <span className="text-gray-400 text-xs text-center px-2">Loading...</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !qrImageUrl.trim()}
            className="w-full bg-orange-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : 'Generate Sticker Sheet'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Paste QR image URL • 12 stickers per A4 sheet
          </p>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showModal && previewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Preview Sticker Sheet</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 p-4 overflow-hidden">
              <object data={previewUrl} type="application/pdf" className="w-full h-[60vh] border rounded-xl">
                <div className="w-full h-[60vh] border rounded-xl bg-gray-50 flex flex-col items-center justify-center text-gray-600 p-8">
                  <svg className="w-16 h-16 text-orange-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-semibold mb-2">PDF Generated Successfully!</p>
                  <p className="text-sm text-gray-500 mb-4 text-center">Your browser cannot preview PDFs inline.</p>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">
                    Open PDF in New Tab
                  </a>
                </div>
              </object>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button onClick={closeModal} className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                Close
              </button>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors text-center">
                Open in New Tab
              </a>
              <a href={previewUrl} download={downloadFilename} className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors text-center">
                Download PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}