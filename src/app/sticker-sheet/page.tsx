'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useRef } from 'react';
import jsQR from 'jsqr';

export default function StickerSheetPage() {
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isValidQr, setIsValidQr] = useState(false);
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [decodedUrl, setDecodedUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [urlType, setUrlType] = useState<'qr-image' | 'website' | null>(null);
  const [generatedQrUrl, setGeneratedQrUrl] = useState('');
  const [urlDisplayText, setUrlDisplayText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if URL is likely a QR code image URL
  const isQrImageUrl = (url: string): boolean => {
    const lowerUrl = url.toLowerCase();
    // Check for common QR code API patterns
    if (lowerUrl.includes('qrserver.com') || 
        lowerUrl.includes('qrcode') || 
        lowerUrl.includes('api.qr') ||
        lowerUrl.includes('chart.googleapis.com/chart?') && lowerUrl.includes('qr')) {
      return true;
    }
    // Check for image file extensions
    if (/\.(png|jpg|jpeg|gif|svg|webp)(\?|$)/i.test(url)) {
      return true;
    }
    return false;
  };

  // Generate QR code URL for a website
  const generateQrCodeUrl = (websiteUrl: string): string => {
    const encodedUrl = encodeURIComponent(websiteUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodedUrl}`;
  };

  // Handle URL input change with auto-detection
  const handleUrlChange = (url: string) => {
    setQrImageUrl(url);
    setError('');
    setIsValidQr(false);
    setUrlType(null);
    setGeneratedQrUrl('');
    setUrlDisplayText('');

    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    try {
      new URL(trimmedUrl);
      
      if (isQrImageUrl(trimmedUrl)) {
        // It's a QR code image URL
        setUrlType('qr-image');
        // Extract data param if exists (for qrserver URLs)
        try {
          const parsed = new URL(trimmedUrl);
          setUrlDisplayText(parsed.searchParams.get('data') || '');
        } catch {
          setUrlDisplayText('');
        }
      } else {
        // It's a regular website URL - generate QR code for it
        setUrlType('website');
        setUrlDisplayText(trimmedUrl);
        setGeneratedQrUrl(generateQrCodeUrl(trimmedUrl));
      }
    } catch {
      // Invalid URL format
      setUrlType(null);
    }
  };

  // Get the actual QR image URL to use (either direct or generated)
  const getEffectiveQrUrl = (): string => {
    if (urlType === 'website' && generatedQrUrl) {
      return generatedQrUrl;
    }
    return qrImageUrl.trim();
  };

  // Scan QR code from image, extract URL, and crop only the QR code pattern (no black border)
  const scanAndCropQRCode = (imageDataUrl: string): Promise<{ data: string; croppedImage: string } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          // Get QR code corner positions
          const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = code.location;
          
          // Calculate the QR code size based on detected corners
          const qrLeft = Math.min(topLeftCorner.x, bottomLeftCorner.x);
          const qrTop = Math.min(topLeftCorner.y, topRightCorner.y);
          const qrRight = Math.max(topRightCorner.x, bottomRightCorner.x);
          const qrBottom = Math.max(bottomLeftCorner.y, bottomRightCorner.y);
          
          const qrWidth = qrRight - qrLeft;
          const qrHeight = qrBottom - qrTop;
          
          // QR codes have a "quiet zone" (white margin) - we need to add it
          // Standard quiet zone is 4 modules. Estimate module size from QR dimensions
          const moduleSize = qrWidth / 25; // Approximate for typical QR
          const quietZone = moduleSize * 4; // Standard 4-module quiet zone
          
          // Create final canvas with white background and proper quiet zone
          const finalSize = Math.max(qrWidth, qrHeight) + (quietZone * 2);
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = finalSize;
          cropCanvas.height = finalSize;
          const cropCtx = cropCanvas.getContext('2d');
          
          if (cropCtx) {
            // Fill with pure white background
            cropCtx.fillStyle = '#FFFFFF';
            cropCtx.fillRect(0, 0, finalSize, finalSize);
            
            // Center the QR code with quiet zone margin
            const offsetX = quietZone + (finalSize - quietZone * 2 - qrWidth) / 2;
            const offsetY = quietZone + (finalSize - quietZone * 2 - qrHeight) / 2;
            
            // Draw only the QR code pattern (exactly from detected corners)
            cropCtx.drawImage(
              img,
              qrLeft, qrTop, qrWidth, qrHeight,
              offsetX, offsetY, qrWidth, qrHeight
            );
            
            resolve({
              data: code.data,
              croppedImage: cropCanvas.toDataURL('image/png')
            });
          } else {
            resolve({ data: code.data, croppedImage: imageDataUrl });
          }
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageDataUrl;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setUploadedFile(file);
    setError('');
    setIsScanning(true);
    setDecodedUrl('');

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      // Scan QR code and crop only the QR portion
      const result = await scanAndCropQRCode(dataUrl);
      setIsScanning(false);

      if (result) {
        setUploadPreview(result.croppedImage); // Use cropped QR image
        setDecodedUrl(result.data);
        setIsValidQr(true);
      } else {
        setUploadPreview(dataUrl); // Show original if no QR found
        setError('No QR code detected in image. Please upload a clear QR code image.');
        setIsValidQr(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setUploadPreview(null);
    setIsValidQr(false);
    setDecodedUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (inputMode === 'url') {
      const trimmedUrl = qrImageUrl.trim();
      
      if (!trimmedUrl) {
        setError('Please paste a URL');
        return;
      }

      try {
        new URL(trimmedUrl);
      } catch {
        setError('Invalid URL format');
        return;
      }

      if (!isValidQr) {
        setError('No QR code detected. Please wait for image to load or check the URL.');
        return;
      }
    } else {
      if (!uploadedFile || !uploadPreview) {
        setError('Please upload a QR code image');
        return;
      }
      if (!isValidQr || !decodedUrl) {
        setError('No QR code detected. Please upload a clear QR code image.');
        return;
      }
    }

    setIsGenerating(true);
    setError('');

    try {
      let response;
      
      if (inputMode === 'url') {
        // Use the effective QR URL (either direct image or generated from website URL)
        const effectiveUrl = getEffectiveQrUrl();
        response = await fetch('/api/generate-stickers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            qrImageUrl: effectiveUrl,
            // For website URLs, pass the website as label text
            ...(urlType === 'website' && { labelText: urlDisplayText })
          }),
        });
      } else {
        response = await fetch('/api/generate-stickers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            qrImageBase64: uploadPreview,
            labelText: decodedUrl 
          }),
        });
      }

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
  const displayText = inputMode === 'url' ? urlDisplayText : decodedUrl;
  const downloadFilename = `stickers-${displayText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20) || 'qr'}.pdf`;
  const canGenerate = inputMode === 'url' ? (qrImageUrl.trim() && isValidQr) : (uploadedFile && uploadPreview && isValidQr);

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
          {/* Toggle Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => { setInputMode('url'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${inputMode === 'url' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Paste URL
            </button>
            <button
              onClick={() => { setInputMode('upload'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${inputMode === 'upload' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Upload Image
            </button>
          </div>

          {/* URL Input Mode */}
          {inputMode === 'url' && (
            <>
              <div>
                <label htmlFor="qrImageUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                  Paste URL
                </label>
                <textarea
                  id="qrImageUrl"
                  value={qrImageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Paste QR image URL or website URL..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-mono text-sm transition-all resize-none"
                  rows={2}
                />
                {urlType && (
                  <p className="text-xs text-gray-500 mt-1">
                    {urlType === 'qr-image' ? '🖼️ QR image detected' : '🌐 Website URL - QR code will be generated'}
                  </p>
                )}
              </div>

              {urlDisplayText && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-sm text-orange-800">
                    <span className="font-semibold">Label:</span> {urlDisplayText}
                  </p>
                </div>
              )}

              {(qrImageUrl && urlType === 'qr-image') && (
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

              {(generatedQrUrl && urlType === 'website') && (
                <div className="flex justify-center">
                  <img
                    src={generatedQrUrl}
                    alt="Generated QR"
                    className={`w-28 h-28 border-2 rounded-xl shadow-sm ${isValidQr ? 'border-green-400' : 'border-gray-200'}`}
                    onLoad={() => setIsValidQr(true)}
                    onError={() => { setIsValidQr(false); setError('Failed to generate QR code.'); }}
                    style={{ display: isValidQr ? 'block' : 'none' }}
                  />
                  {!isValidQr && !error && (
                    <div className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
                      <span className="text-gray-400 text-xs text-center px-2">Generating QR...</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Upload Mode */}
          {inputMode === 'upload' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload QR Code Image
                </label>
                {!uploadPreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-500">Click to upload QR code</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, or GIF</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <div className="flex justify-center">
                      <img
                        src={uploadPreview}
                        alt="Uploaded QR"
                        className={`w-28 h-28 border-2 rounded-xl shadow-sm object-contain bg-white ${isValidQr ? 'border-green-400' : 'border-red-400'}`}
                      />
                    </div>
                    <button
                      onClick={clearUpload}
                      className="absolute top-0 right-1/2 translate-x-[70px] -translate-y-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {isScanning && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Scanning QR code...
                  </p>
                </div>
              )}

              {decodedUrl && !isScanning && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">Detected URL:</span> {decodedUrl}
                  </p>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
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
            {inputMode === 'url' ? 'Paste QR image or website URL' : 'Upload QR code image'} • 12 stickers per A4 sheet
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