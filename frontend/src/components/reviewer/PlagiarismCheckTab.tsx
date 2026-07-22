'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { Upload, CheckCircle, AlertCircle, Loader, ExternalLink, Clock } from 'lucide-react';

interface PlagiarismResult {
  success: boolean;
  message: string;
  scan_id: string;
  similarity_score?: number;
  ai_score?: number;
  status: string;
  report_url?: string;
  note?: string;
}

export default function PlagiarismCheckTab() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [polling, setPolling] = useState(false);

  // Polling for scan results
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (result?.scan_id && result.status === 'processing') {
      setPolling(true);
      interval = setInterval(async () => {
        try {
          const res = await fetch(apiUrl(`copyleaks/scan-status/${result.scan_id}/`), {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
          });

          if (res.ok) {
            const data = await res.json();
            if (data.status === 'completed') {
              setResult(data);
              setPolling(false);
              clearInterval(interval!);
            }
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [result]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (selectedFile: File) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    if (!allowed.some(ext => selectedFile.name.toLowerCase().endsWith(ext))) {
      setError(`Allowed types: ${allowed.join(', ')}`);
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }
    setError(null);
    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Please log in again.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(apiUrl('plagiarism-check/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start plagiarism check');
      }

      setResult(data);
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred during plagiarism check.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h3 className="text-3xl font-bold text-gray-900 mb-2">Plagiarism & AI Detection</h3>
        <p className="text-gray-600">
          Upload a manuscript to check for plagiarism and AI-generated content.
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-3xl p-10 shadow-lg border border-gray-200 mb-10">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all ${
            dragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Upload className="mx-auto h-16 w-16 text-gray-400 mb-6" />
          <p className="text-xl font-semibold text-gray-900 mb-2">Drag & drop your file here</p>
          <p className="text-gray-600 mb-8">or click below to browse</p>

          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            disabled={loading}
            className="hidden"
            id="plagiarism-upload"
          />
          <label
            htmlFor="plagiarism-upload"
            className={`inline-block px-8 py-4 rounded-2xl font-semibold transition cursor-pointer ${
              loading ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Select Manuscript
          </label>
        </div>

        {file && (
          <div className="mt-6 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div>
              <p className="font-medium text-blue-900">{file.name}</p>
              <p className="text-sm text-blue-700">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <button onClick={() => setFile(null)} className="text-red-600 hover:text-red-700">Remove</button>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className={`w-full mt-8 py-4 rounded-2xl font-semibold text-lg transition ${
            !file || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {loading ? (
            <>
              <Loader className="inline animate-spin mr-3" size={20} />
              Submitting to Copyleaks...
            </>
          ) : (
            'Start Plagiarism & AI Check'
          )}
        </button>
      </div>

      {/* Current Scan Result */}
      {result && (
        <div className="bg-white rounded-3xl p-10 shadow-lg border border-gray-200">
          <div className="flex items-center gap-4 mb-8">
            {result.status === 'completed' ? (
              <CheckCircle className="h-10 w-10 text-green-600" />
            ) : (
              <Clock className="h-10 w-10 text-blue-600 animate-pulse" />
            )}
            <h4 className="text-3xl font-bold text-gray-900">
              {result.status === 'completed' ? 'Scan Completed' : 'Scan in Progress'}
            </h4>
          </div>

          {result.similarity_score !== undefined && (
            <div className={`rounded-2xl p-10 mb-8 text-center ${result.similarity_score < 20 ? 'bg-green-50' : result.similarity_score < 40 ? 'bg-yellow-50' : 'bg-red-50'}`}>
              <p className="text-sm font-medium text-gray-600">Similarity Score</p>
              <p className={`text-7xl font-bold mt-2 ${result.similarity_score < 20 ? 'text-green-600' : result.similarity_score < 40 ? 'text-orange-600' : 'text-red-600'}`}>
                {result.similarity_score}%
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-2xl">
              <p className="text-gray-600 text-sm">Scan ID</p>
              <p className="font-mono text-gray-900 break-all mt-1">{result.scan_id}</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl">
              <p className="text-gray-600 text-sm">Status</p>
              <p className="font-semibold text-gray-900 capitalize mt-1">{result.status}</p>
            </div>
          </div>

          {result.report_url && (
            <a
              href={result.report_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition font-medium"
            >
              View Detailed Report <ExternalLink size={20} />
            </a>
          )}

          {result.note && <p className="text-gray-600 mt-6">{result.note}</p>}
        </div>
      )}
    </div>
  );
}