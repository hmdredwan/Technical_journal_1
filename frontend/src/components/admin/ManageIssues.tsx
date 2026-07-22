// src/components/admin/ManageIssues.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { Plus, Edit, Trash2, File as FileIcon } from 'lucide-react';

interface Volume {
  id: number;
  number: number;
  year: number;
  title: string;
  created_at: string;
}

interface Issue {
  id: number;
  volume: number | { id: number; number: number; year: number; title: string; created_at: string };
  number: number;
  period: string;
  publication_date: string | null;
  cover_image: string | null;
  introductory_file: string | null;
  created_at: string;
}

interface Paper {
  id: number;
  issue: number;
  title: string;
  authors: string;
  abstract: string;
  keywords: string;
  pages: string;
  doi: string;
  file: string;
  views: number;
  downloads: number;
  created_at: string;
}

interface ReadyManuscript {
  id: number;
  title: string;
  abstract: string;
  keywords: string;
  authors: Array<{ id: number; full_name: string }>;
  manual_authors?: string;
  latest_version?: { id: number; version_number: number; version_type: string; file: string | null; created_at: string } | null;
  files?: string | Array<string | { file: string }> | null;
  file?: string | null;
  manuscript_file?: string | null;
  file_path?: string | null;
}

type SubTab = 'volumes' | 'issues' | 'papers';

export default function ManageIssues() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('volumes');
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolumeId, setSelectedVolumeId] = useState<number | ''>('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [volumeFormError, setVolumeFormError] = useState('');
  const [issueFormError, setIssueFormError] = useState('');
  const [doiError, setDoiError] = useState('');
  const [manuscriptSelectionError, setManuscriptSelectionError] = useState('');
  const [usedManuscriptIds, setUsedManuscriptIds] = useState<number[]>([]);
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showPaperForm, setShowPaperForm] = useState(false);
  const [readyManuscripts, setReadyManuscripts] = useState<ReadyManuscript[]>([]);
  const [manuscriptSearch, setManuscriptSearch] = useState('');
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<number | ''>('');
  // Form states
  const [volumeForm, setVolumeForm] = useState({ number: '', year: '', title: '' });
  const [issueForm, setIssueForm] = useState({
    number: '',
    period: '',
    publication_date: '',
    cover_image: null as File | null,
    introductory_file: null as File | null,
  });
  const [paperForm, setPaperForm] = useState({
    title: '',
    authors: '',
    abstract: '',
    keywords: '',
    pages: '',
    doi: '',
    file: null as File | null,
  });

  const [editingVolume, setEditingVolume] = useState<Volume | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchVolumes();
  }, []);

  useEffect(() => {
    if (selectedVolumeId) {
      fetchIssues(selectedVolumeId);
      setSelectedIssue(null);
      setPapers([]);
    } else {
      setIssues([]);
      setSelectedIssue(null);
      setPapers([]);
    }
  }, [selectedVolumeId]);

  useEffect(() => {
    if (selectedIssue) {
      fetchPapers(selectedIssue.id);
    } else {
      setPapers([]);
    }
  }, [selectedIssue]);

  const fetchVolumes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('volumes/'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let errMsg = `Failed to load volumes (${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || (Object.values(errData)[0] as string[] | undefined)?.[0] || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      setVolumes(Array.isArray(data) ? data : data.results || []);
      if (data.length > 0 && !selectedVolumeId) {
        setSelectedVolumeId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Could not load volumes');
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async (volumeId: number) => {
    try {
      const res = await fetch(apiUrl(`issues/?volume=${volumeId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let errMsg = `Failed to load issues (${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || (Object.values(errData)[0] as string[] | undefined)?.[0] || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load issues');
      setIssues([]);
    }
  };

  const fetchPapers = async (issueId: number) => {
    try {
      const res = await fetch(apiUrl(`papers/?issue=${issueId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let errMsg = `Failed to load papers (${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || (Object.values(errData)[0] as string[] | undefined)?.[0] || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setPapers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load papers');
      setPapers([]);
    }
  };

  const fetchReadyManuscripts = async () => {
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) return;

    try {
      const res = await fetch(apiUrl('editor-submissions/?status=ready_for_publication'), {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      const manuscripts = (Array.isArray(data) ? data : data.results || []).map((item: any) => ({
        ...item,
        files: item.files || item.latest_version?.file || item.file || item.manuscript_file || item.file_path || '',
      }));
      setReadyManuscripts(manuscripts);
    } catch {
      // ignore failures until selection is needed
    }
  };

  const resolveFileUrl = (path: string) => {
    if (!path) return '';
    let trimmed = path.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
    if (trimmed.startsWith('media/') || trimmed.startsWith('api/media/')) {
      return `/${trimmed}`;
    }
    return `/media/${trimmed}`;
  };

  const getManuscriptFilePath = (manuscript: ReadyManuscript | null) => {
    if (!manuscript) return '';
    if (manuscript.latest_version?.file) return manuscript.latest_version.file;
    if (typeof manuscript.files === 'string' && manuscript.files) return manuscript.files;
    if (Array.isArray((manuscript as any).files) && (manuscript as any).files.length > 0) {
      const candidate = (manuscript as any).files[0];
      if (typeof candidate === 'string') return candidate;
      if (candidate?.file) return candidate.file;
    }
    const anyManuscript = manuscript as any;
    if (typeof anyManuscript.file === 'string' && anyManuscript.file) return anyManuscript.file;
    if (typeof anyManuscript.manuscript_file === 'string' && anyManuscript.manuscript_file) return anyManuscript.manuscript_file;
    if (typeof anyManuscript.file_path === 'string' && anyManuscript.file_path) return anyManuscript.file_path;
    return '';
  };

  const fetchFileFromUrl = async (url: string): Promise<File | null> => {
    if (!url) return null;
    try {
      const currentToken = localStorage.getItem('access_token');
      const response = await fetch(url, {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : undefined,
      });
      if (!response.ok) return null;
      const blob = await response.blob();
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1] || `manuscript-${Date.now()}`;
      return new File([blob], decodeURIComponent(filename), { type: blob.type || 'application/octet-stream' });
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (activeSubTab === 'papers') {
      fetchReadyManuscripts();
    }
  }, [activeSubTab]);

  const selectedManuscript = selectedManuscriptId
    ? readyManuscripts.find(item => item.id === selectedManuscriptId) || null
    : null;

  useEffect(() => {
    if (!selectedManuscript) return;

    const fillMetadata = async () => {
      setPaperForm(prev => ({
        ...prev,
        title: selectedManuscript.title || prev.title,
        authors: selectedManuscript.manual_authors
          ? selectedManuscript.manual_authors
          : selectedManuscript.authors?.map(a => a.full_name).join(', ') || prev.authors,
        abstract: selectedManuscript.abstract || prev.abstract,
        keywords: selectedManuscript.keywords || prev.keywords,
      }));

      if (!paperForm.file) {
        const manuscriptFilePath = getManuscriptFilePath(selectedManuscript);
        const manuscriptUrl = manuscriptFilePath ? resolveFileUrl(manuscriptFilePath) : '';
        if (manuscriptUrl) {
          const fetchedFile = await fetchFileFromUrl(manuscriptUrl);
          if (fetchedFile) {
            setPaperForm(prev => ({ ...prev, file: fetchedFile }));
          }
        }
      }
    };

    fillMetadata();
  }, [selectedManuscript]);

  // Volume CRUD
  const handleCreateVolume = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVolumeFormError('');
    const yearValue = volumeForm.year.trim();
    const yearNumber = Number(yearValue);
    if (!yearValue || Number.isNaN(yearNumber) || !Number.isInteger(yearNumber)) {
      setVolumeFormError('Please enter a valid year for the volume.');
      return;
    }
    if (isDuplicateVolumeYear(yearValue)) {
      setVolumeFormError(`A volume for year ${yearNumber} already exists. Please choose a different year.`);
      return;
    }

    try {
      const res = await fetch(apiUrl('volumes/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(volumeForm),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errMsg = 'Failed to create volume';
        if (errData.detail) errMsg = errData.detail;
        else if (errData.message) errMsg = errData.message;
        else if (typeof errData === 'object' && errData !== null) {
          const values = Object.values(errData);
          if (values.length > 0) {
            const firstValue = values[0];
            errMsg = Array.isArray(firstValue) && firstValue.length > 0 ? String(firstValue[0]) : String(firstValue);
          }
        }
        throw new Error(errMsg);
      }
      const newVolume = await res.json();
      setVolumes(prev => [...prev, newVolume]);
      setSelectedVolumeId(newVolume.id);
      setShowVolumeForm(false);
      setVolumeForm({ number: '', year: '', title: '' });
      setError('');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleUpdateVolume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVolume) return;
    setError('');
    setVolumeFormError('');

    const yearValue = volumeForm.year.trim();
    const yearNumber = Number(yearValue);
    if (!yearValue || Number.isNaN(yearNumber) || !Number.isInteger(yearNumber)) {
      setVolumeFormError('Please enter a valid year for the volume.');
      return;
    }
    if (isDuplicateVolumeYear(yearValue, editingVolume.id)) {
      setVolumeFormError(`A volume for year ${yearNumber} already exists. Please choose a different year.`);
      return;
    }

    try {
      const res = await fetch(apiUrl(`volumes/${editingVolume.id}/`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(volumeForm),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errMsg = 'Failed to update volume';
        if (errData.detail) errMsg = errData.detail;
        else if (errData.message) errMsg = errData.message;
        else if (typeof errData === 'object' && errData !== null) {
          const values = Object.values(errData);
          if (values.length > 0) {
            const firstValue = values[0];
            errMsg = Array.isArray(firstValue) && firstValue.length > 0 ? String(firstValue[0]) : String(firstValue);
          }
        }
        throw new Error(errMsg);
      }
      fetchVolumes();
      setEditingVolume(null);
      setShowVolumeForm(false);
      setVolumeForm({ number: '', year: '', title: '' });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDeleteVolume = async (id: number) => {
    if (!confirm('Delete this volume and all its issues/papers?')) return;
    try {
      const res = await fetch(apiUrl(`volumes/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errMsg = 'Failed to delete volume';
        if (errData.detail) errMsg = errData.detail;
        else if (errData.message) errMsg = errData.message;
        else if (typeof errData === 'object' && errData !== null) {
          const values = Object.values(errData);
          if (values.length > 0) {
            const firstValue = values[0];
            errMsg = Array.isArray(firstValue) && firstValue.length > 0 ? String(firstValue[0]) : String(firstValue);
          }
        }
        throw new Error(errMsg);
      }
      setVolumes(prev => prev.filter(v => v.id !== id));
      if (selectedVolumeId === id) {
        setSelectedVolumeId('');
        setIssues([]);
        setSelectedIssue(null);
        setPapers([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete volume');
    }
  };

  // Issue CRUD
  const getIssueVolumeId = (issue: Issue | null | undefined) => {
    if (!issue) return selectedVolumeId || null;
    if (typeof issue.volume === 'number') return issue.volume;
    if (issue.volume && typeof issue.volume === 'object' && 'id' in issue.volume) {
      return issue.volume.id;
    }
    return selectedVolumeId || null;
  };

  const isDuplicateVolumeYear = (yearValue: string, excludeVolumeId?: number | null) => {
    const year = Number(yearValue);
    if (!yearValue || Number.isNaN(year) || !Number.isInteger(year)) {
      return false;
    }
    return volumes.some(volume => volume.year === year && volume.id !== excludeVolumeId);
  };

  const isDuplicateIssuePeriod = (periodValue: string, excludeIssueId?: number | null) => {
    const normalizedPeriod = periodValue.trim().toLowerCase();
    if (!normalizedPeriod) return false;
    return issues.some(issue => {
      if (excludeIssueId && issue.id === excludeIssueId) return false;
      return issue.period?.trim().toLowerCase() === normalizedPeriod;
    });
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIssueFormError('');
    if (!selectedVolumeId) {
      setIssueFormError('Please select a volume first.');
      return;
    }

    const periodValue = issueForm.period.trim();
    if (periodValue && isDuplicateIssuePeriod(periodValue)) {
      setIssueFormError(`An issue for period "${periodValue}" already exists in this volume. Please choose a different period or edit the existing issue.`);
      return;
    }

    const data = new FormData();
    data.append('volume_id', selectedVolumeId.toString());
    data.append('number', issueForm.number);
    data.append('period', issueForm.period || '');
    if (issueForm.publication_date) data.append('publication_date', issueForm.publication_date);
    if (issueForm.cover_image) data.append('cover_image', issueForm.cover_image);
    if (issueForm.introductory_file) data.append('introductory_file', issueForm.introductory_file);
    try {
      const res = await fetch(apiUrl('issues/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let message = 'Failed to create issue';
        if (errData.detail) message = errData.detail;
        else if (errData.non_field_errors) message = errData.non_field_errors[0];
        else if (typeof errData === 'object' && errData !== null) {
          const values = Object.values(errData);
          if (values.length > 0) {
            const firstValue = values[0];
            message = Array.isArray(firstValue) && firstValue.length > 0 ? String(firstValue[0]) : String(firstValue);
          }
        }
        throw new Error(message);
      }
      const newIssue = await res.json();
      setIssues(prev => [...prev, newIssue]);
      setShowIssueForm(false);
      setIssueForm({
        number: '',
        period: '',
        publication_date: '',
        cover_image: null,
        introductory_file: null,
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    }
  };

  const handleUpdateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIssue) return;
    setError('');
    setIssueFormError('');

    const volumeId = getIssueVolumeId(editingIssue);
    if (!volumeId) {
      setIssueFormError('Unable to determine the issue volume. Please select a volume and try again.');
      return;
    }

    const periodValue = issueForm.period.trim();
    if (periodValue && isDuplicateIssuePeriod(periodValue, editingIssue.id)) {
      setIssueFormError(`An issue for period "${periodValue}" already exists in this volume. Please choose a different period or edit the existing issue.`);
      return;
    }

    const payload = {
      volume_id: Number(volumeId),
      number: issueForm.number,
      period: issueForm.period,
      publication_date: issueForm.publication_date || null,
    };

    try {
      const res = await fetch(apiUrl(`issues/${editingIssue.id}/`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let message = 'Failed to update issue';
        if (errData.detail) message = errData.detail;
        else if (errData.non_field_errors) message = errData.non_field_errors[0];
        else if (typeof errData === 'object' && errData !== null) {
          const values = Object.values(errData);
          if (values.length > 0) {
            const firstValue = values[0];
            message = Array.isArray(firstValue) && firstValue.length > 0 ? String(firstValue[0]) : String(firstValue);
          }
        }
        throw new Error(message);
      }

      fetchIssues(selectedVolumeId || 0); // refresh list
      setEditingIssue(null);
      setShowIssueForm(false);
      setIssueForm({
        number: '',
        period: '',
        publication_date: '',
        cover_image: null,
        introductory_file: null,
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the issue');
    }
  };

  const handleDeleteIssue = async (id: number) => {
    if (!confirm('Delete this issue and all its papers?')) return;
    try {
      const res = await fetch(apiUrl(`issues/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let message = 'Failed to delete issue';
        if (errData.detail) message = errData.detail;
        else if (typeof errData === 'object' && errData !== null) {
          const values = Object.values(errData);
          if (values.length > 0) {
            const firstValue = values[0];
            message = Array.isArray(firstValue) && firstValue.length > 0 ? String(firstValue[0]) : String(firstValue);
          }
        }
        throw new Error(message);
      }
      fetchIssues(selectedVolumeId || 0);
      if (selectedIssue?.id === id) {
        setSelectedIssue(null);
        setPapers([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete issue');
    }
  };

  // Paper CRUD
  const handleCreatePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !selectedIssue.id) {
      setError('Please select an issue first');
      return;
    }

    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) {
      setError('Session expired. Please login again.');
      return;
    }

    const title = paperForm.title.trim();
    const authors = paperForm.authors.trim();
    const abstract = paperForm.abstract.trim();
    const keywords = paperForm.keywords.trim();
    const pages = paperForm.pages.trim();
    const doi = paperForm.doi.trim();
    setDoiError('');

    if (!doi) {
      const message = 'DOI is required to create a paper.';
      setDoiError(message);
      setError(message);
      return;
    }

    if (!paperForm.file && !selectedManuscript) {
      setError('Please attach a paper file or select a ready manuscript.');
      return;
    }

    const shouldUseReadySubmissionEndpoint = selectedManuscript && !paperForm.file;
    let res;

    try {
      if (shouldUseReadySubmissionEndpoint) {
        const submissionData = new FormData();
        submissionData.append('submission_id', String(selectedManuscript.id));
      submissionData.append('issue_id', selectedIssue.id.toString());
      submissionData.append('title', title);
      submissionData.append('authors', authors);
      submissionData.append('abstract', abstract);
      submissionData.append('keywords', keywords);
      submissionData.append('pages', pages);
      submissionData.append('doi', doi);

      res = await fetch(apiUrl('papers/create-from-submission/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
        body: submissionData,
      });
    } else {
      const data = new FormData();
      data.append('issue_id', selectedIssue.id.toString());
      data.append('title', title);
      data.append('authors', authors);
      data.append('abstract', abstract);
      data.append('keywords', keywords);
      data.append('pages', pages);
      data.append('doi', doi);
      if (paperForm.file) {
        data.append('file', paperForm.file);
      }

      res = await fetch(apiUrl('papers/'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
        body: data,
      });
    }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let message = 'Failed to create paper';
        const flattenError = (value: unknown): string[] => {
          if (Array.isArray(value)) return value.flatMap(item => flattenError(item));
          if (value && typeof value === 'object') {
            return Object.values(value as Record<string, unknown>).flatMap(item => flattenError(item));
          }
          return typeof value === 'string' ? [value] : [];
        };
        const errorMessages = flattenError(errData).filter(Boolean);
        const errorText = errorMessages.join(' ').toLowerCase();

        if (res.status === 401) {
          message = 'Session expired. Please login again.';
          localStorage.clear();
          setTimeout(() => window.location.href = '/login', 2000);
        } else if (errorText.includes('doi') && (errorText.includes('already') || errorText.includes('exists') || errorText.includes('duplicate'))) {
          message = 'This DOI already exists. Please use a different DOI.';
        } else if (typeof errData === 'object' && errData !== null && 'detail' in errData && typeof (errData as any).detail === 'string' && (errData as any).detail) {
          message = (errData as any).detail;
        } else if (errorMessages.length > 0) {
          message = errorMessages[0];
        } else if (typeof errData === 'string' && errData) {
          message = errData;
        }
        throw new Error(message);
      }

      const newPaper = await res.json();
      if (selectedIssue?.id) {
        await fetchPapers(selectedIssue.id);
      }
      if (shouldUseReadySubmissionEndpoint && selectedManuscript) {
        setUsedManuscriptIds(prev => prev.includes(selectedManuscript.id) ? prev : [...prev, selectedManuscript.id]);
      }
      setShowPaperForm(false);
      setPaperForm({
        title: '',
        authors: '',
        abstract: '',
        keywords: '',
        pages: '',
        doi: '',
        file: null,
      });
      setDoiError('');
      setError('');
    } catch (err: any) {
      const message = err.message || 'Failed to create paper';
      if (message.toLowerCase().includes('doi') && (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists') || message.toLowerCase().includes('duplicate'))) {
        setDoiError(message);
        setError('');
      } else {
        setDoiError('');
        setError(message);
      }
    }
  };

  // const handleUpdatePaper = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!editingPaper) return;

  //   const currentToken = localStorage.getItem('access_token');
  //   if (!currentToken) {
  //     setError('Session expired. Please login again.');
  //     return;
  //   }

  //   const data = new FormData();
  //   data.append('issue_id', editingPaper.issue.toString());
  //   data.append('title', paperForm.title);
  //   data.append('authors', paperForm.authors);
  //   data.append('abstract', paperForm.abstract);
  //   data.append('keywords', paperForm.keywords);
  //   data.append('pages', paperForm.pages);
  //   data.append('doi', paperForm.doi);
  //   if (paperForm.file) data.append('file', paperForm.file);

  //   try {
  //     const res = await fetch(apiUrl(`papers/${editingPaper.id}/`), {
  //       method: 'PUT',
  //       headers: { Authorization: `Bearer ${currentToken}` },
  //       body: data,
  //     });
  //     if (!res.ok) {
  //       const errData = await res.json().catch(() => ({}));
  //       let message = 'Failed to update paper';
  //       if (errData.detail) message = errData.detail;
  //       else if (typeof errData === 'object' && errData !== null) {
  //         const values = Object.values(errData);
  //         if (values.length > 0) {
  //           const firstValue = values[0];
  //           message = Array.isArray(firstValue) && firstValue.length > 0 ? String(firstValue[0]) : String(firstValue);
  //         }
  //       }
  //       throw new Error(message);
  //     }
  //     fetchPapers(selectedIssue?.id || 0);
  //     setEditingPaper(null);
  //     setShowPaperForm(false);
  //     setPaperForm({ title: '', authors: '', abstract: '', keywords: '', pages: '', doi: '', file: null });
  //   } catch (err: any) {
  //     setError(err.message || 'Failed to update paper');
  //   }
  // };

  const handleUpdatePaper = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPaper) return;
  
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) {
      setError('Session expired. Please login again.');
      return;
    }
  
    // Safely get issue_id
    const issueId = editingPaper.issue || selectedIssue?.id;
  
    if (!issueId) {
      setError('Issue ID is missing. Please select an issue.');
      return;
    }
  
    const data = new FormData();
    data.append('issue_id', issueId.toString());
    data.append('title', paperForm.title.trim());
    data.append('authors', paperForm.authors.trim());
    data.append('abstract', paperForm.abstract.trim());
    data.append('keywords', paperForm.keywords.trim());
    data.append('pages', paperForm.pages.trim());
    data.append('doi', paperForm.doi.trim());
  
    // Only append new file if user selected one
    if (paperForm.file) {
      data.append('file', paperForm.file);
    }
  
    try {
      const res = await fetch(apiUrl(`papers/${editingPaper.id}/`), {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${currentToken}` 
        },
        body: data,
      });
  
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let message = 'Failed to update paper';
        
        if (errData.detail) {
          message = errData.detail;
        } else if (typeof errData === 'object' && errData !== null) {
          const values = Object.values(errData);
          if (values.length > 0) {
            const firstValue = values[0];
            message = Array.isArray(firstValue) && firstValue.length > 0 
              ? String(firstValue[0]) 
              : String(firstValue);
          }
        }
        throw new Error(message);
      }
  
      // Refresh the papers list
      fetchPapers(selectedIssue?.id || 0);
  
      // Reset form and close modal
      setEditingPaper(null);
      setShowPaperForm(false);
      setPaperForm({ 
        title: '', 
        authors: '', 
        abstract: '', 
        keywords: '', 
        pages: '', 
        doi: '', 
        file: null 
      });
  
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to update paper');
    }
  };

  const handleDeletePaper = async (id: number) => {
    if (!confirm('Delete this paper?')) return;
    try {
      const res = await fetch(apiUrl(`papers/${id}/`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let message = 'Failed to delete paper';
        if (errData.detail) message = errData.detail;
        else if (typeof errData === 'object' && errData !== null) {
          const values = Object.values(errData);
          if (values.length > 0) {
            const firstValue = values[0];
            message = Array.isArray(firstValue) && firstValue.length > 0 ? String(firstValue[0]) : String(firstValue);
          }
        }
        throw new Error(message);
      }
      fetchPapers(selectedIssue?.id || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to delete paper');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
        Manage Volumes, Issues & Papers
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Subtab Navigation */}
      <div className="bg-white border-b rounded-t-xl shadow">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveSubTab('volumes')}
            className={`px-6 py-4 font-medium transition-all border-b-2 ${
              activeSubTab === 'volumes' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Manage Volumes
          </button>
          <button
            onClick={() => setActiveSubTab('issues')}
            className={`px-6 py-4 font-medium transition-all border-b-2 ${
              activeSubTab === 'issues' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Manage Issues
          </button>
          <button
            onClick={() => setActiveSubTab('papers')}
            className={`px-6 py-4 font-medium transition-all border-b-2 ${
              activeSubTab === 'papers' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Manage Papers
          </button>
        </div>
      </div>

      {/* Volumes Tab */}
      {activeSubTab === 'volumes' && (
        <div className="bg-white p-6 md:p-8 rounded-b-xl shadow-md space-y-6 transition-all duration-300 ease-in-out">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">All Volumes</h3>
            <button
              onClick={() => {
                setVolumeForm({ number: '', year: new Date().getFullYear().toString(), title: '' });
                setEditingVolume(null);
                setShowVolumeForm(true);
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              New Volume
            </button>
          </div>

          {(showVolumeForm || editingVolume) && (
            <div className="bg-gray-50 p-6 rounded-xl border shadow-inner transition-opacity duration-300">
              <h4 className="text-lg font-bold mb-6">
                {editingVolume ? 'Edit Volume' : 'Create New Volume'}
              </h4>
              <form onSubmit={editingVolume ? handleUpdateVolume : handleCreateVolume} className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Volume Number *</label>
                  <input
                    type="number"
                    value={volumeForm.number}
                    onChange={e => {
                      setVolumeForm(prev => ({ ...prev, number: e.target.value }));
                      if (volumeFormError) setVolumeFormError('');
                    }}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Year *</label>
                  <input
                    type="number"
                    value={volumeForm.year}
                    onChange={e => {
                      setVolumeForm(prev => ({ ...prev, year: e.target.value }));
                      if (volumeFormError) setVolumeFormError('');
                    }}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-2">Title (optional)</label>
                  <input
                    type="text"
                    value={volumeForm.title}
                    onChange={e => setVolumeForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {volumeFormError && (
                  <div className="md:col-span-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm flex items-start justify-between gap-3">
                    <span>{volumeFormError}</span>
                    <button
                      type="button"
                      onClick={() => setVolumeFormError('')}
                      className="text-red-600 font-semibold hover:text-red-800"
                    >
                      Close
                    </button>
                  </div>
                )}
                <div className="flex gap-4 md:col-span-3">
                  <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg">
                    {editingVolume ? 'Update Volume' : 'Create Volume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVolume(null);
                      setShowVolumeForm(false);
                      setVolumeForm({ number: '', year: '', title: '' });
                      setVolumeFormError('');
                    }}
                    className="px-8 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition shadow-md hover:shadow-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {volumes.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center py-8">
                No volumes yet. Create one to get started.
              </p>
            ) : (
              volumes.map(vol => (
                <div key={vol.id} className="p-6 border rounded-xl hover:shadow-md transition-all duration-200 hover:scale-105">
                  <h4 className="text-lg font-bold">Volume {vol.number}</h4>
                  <p className="text-gray-600 mt-2">Year: {vol.year}</p>
                  {vol.title && <p className="text-gray-700 mt-1">{vol.title}</p>}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        setEditingVolume(vol);
                        setVolumeForm({
                          number: vol.number.toString(),
                          year: vol.year.toString(),
                          title: vol.title,
                        });
                      }}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Edit size={18} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVolume(vol.id)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <Trash2 size={18} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Issues Tab */}
      {activeSubTab === 'issues' && (
        <div className="bg-white p-6 md:p-8 rounded-b-xl shadow-md space-y-6 transition-all duration-300 ease-in-out">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Volume *</label>
              <select
                value={selectedVolumeId}
                onChange={e => setSelectedVolumeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Volume --</option>
                {volumes.map(vol => (
                  <option key={vol.id} value={vol.id}>
                    Volume {vol.number} ({vol.year})
                  </option>
                ))}
              </select>
            </div>
            {selectedVolumeId && (
              <button
                onClick={() => {
                  setIssueForm({
                    number: '',
                    period: '',
                    publication_date: '',
                    cover_image: null,
                    introductory_file: null,
                  });
                  setEditingIssue(null);
                  setShowIssueForm(true);
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <Plus size={18} />
                New Issue
              </button>
            )}
          </div>

          {selectedVolumeId && (
            <>
              {(showIssueForm || editingIssue) && (
                <div className="bg-gray-50 p-6 rounded-xl border shadow-inner transition-opacity duration-300">
                  <h4 className="text-lg font-bold mb-6">
                    {editingIssue ? 'Edit Issue' : 'Create New Issue'}
                  </h4>
                  <form onSubmit={editingIssue ? handleUpdateIssue : handleCreateIssue} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Issue Number *</label>
                        <input
                          type="number"
                          value={issueForm.number}
                          onChange={e => setIssueForm(prev => ({ ...prev, number: e.target.value }))}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Period (e.g. Jan-Jun)</label>
                        <input
                          type="text"
                          value={issueForm.period}
                          onChange={e => {
                            setIssueForm(prev => ({ ...prev, period: e.target.value }));
                            if (issueFormError) setIssueFormError('');
                          }}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        {issueFormError && (
                          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm flex items-center justify-between gap-3">
                            <span>{issueFormError}</span>
                            <button
                              type="button"
                              onClick={() => setIssueFormError('')}
                              className="text-red-600 font-semibold hover:text-red-800"
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Publication Date</label>
                      <input
                        type="date"
                        value={issueForm.publication_date}
                        onChange={e => setIssueForm(prev => ({ ...prev, publication_date: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Cover Image (optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => setIssueForm(prev => ({ ...prev, cover_image: e.target.files?.[0] || null }))}
                          className="w-full p-3 border rounded-lg"
                        />
                        {issueForm.cover_image && <p className="text-sm text-gray-600 mt-1">Selected: {issueForm.cover_image.name}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Introductory File (optional)</label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={e => setIssueForm(prev => ({ ...prev, introductory_file: e.target.files?.[0] || null }))}
                          className="w-full p-3 border rounded-lg"
                        />
                        {issueForm.introductory_file && <p className="text-sm text-gray-600 mt-1">Selected: {issueForm.introductory_file.name}</p>}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
                      >
                        {editingIssue ? 'Update Issue' : 'Create Issue'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIssue(null);
                          setShowIssueForm(false);
                          setIssueForm({ number: '', period: '', publication_date: '', cover_image: null, introductory_file: null });
                          setIssueFormError('');
                        }}
                        className="px-8 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition shadow-md hover:shadow-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold mb-4">
                  Issues in Volume {volumes.find(v => v.id === selectedVolumeId)?.number}
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {issues.length === 0 ? (
                    <p className="text-gray-500 col-span-full text-center py-8">
                      No issues in this volume yet.
                    </p>
                  ) : (
                    issues.map(iss => (
                      <div key={iss.id} className="p-6 border rounded-xl hover:shadow-md transition-all duration-200 hover:scale-105">
                        <h4 className="text-lg font-bold">Issue {iss.number}</h4>
                        <p className="text-gray-600 mt-2">{iss.period}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Published: {iss.publication_date || 'Not set'}
                        </p>
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => {
                              setEditingIssue(iss);
                              setIssueForm({
                                number: iss.number.toString(),
                                period: iss.period,
                                publication_date: iss.publication_date || '',
                                cover_image: null,
                                introductory_file: null,
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Edit size={18} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteIssue(iss.id)}
                            className="text-red-600 hover:text-red-800 flex items-center gap-1"
                          >
                            <Trash2 size={18} /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Papers Tab */}
      {activeSubTab === 'papers' && (
        <div className="bg-white p-6 md:p-8 rounded-b-xl shadow-md space-y-6 transition-all duration-300 ease-in-out">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Volume *</label>
              <select
                value={selectedVolumeId}
                onChange={e => setSelectedVolumeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Volume --</option>
                {volumes.map(vol => (
                  <option key={vol.id} value={vol.id}>
                    Volume {vol.number} ({vol.year})
                  </option>
                ))}
              </select>
            </div>
            {selectedVolumeId && (
              <div>
                <label className="block text-sm font-medium mb-2">Select Issue *</label>
                <select
                  value={selectedIssue?.id || ''}
                  onChange={e => {
                    const issueId = Number(e.target.value);
                    const issue = issues.find(i => i.id === issueId);
                    setSelectedIssue(issue || null);
                  }}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Issue --</option>
                  {issues.map(iss => (
                    <option key={iss.id} value={iss.id}>
                      Issue {iss.number} {iss.period ? `(${iss.period})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedIssue && (
            <>
              {(showPaperForm || editingPaper) && (
                <div className="bg-gray-50 p-6 rounded-xl border shadow-inner transition-opacity duration-300">
                  <h4 className="text-lg font-bold mb-6">
                    {editingPaper ? 'Edit Paper' : 'Add New Paper'}
                  </h4>
                  <form onSubmit={editingPaper ? handleUpdatePaper : handleCreatePaper} className="space-y-6">
                    {!editingPaper && (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium mb-2">Search Ready-to-Publish Manuscripts</label>
                            <input
                              type="text"
                              value={manuscriptSearch}
                              onChange={e => setManuscriptSearch(e.target.value)}
                              placeholder="Search by title..."
                              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Select Manuscript</label>
                            <select
                              value={selectedManuscriptId}
                              onChange={e => {
                                const nextId = e.target.value ? Number(e.target.value) : '';
                                setSelectedManuscriptId(nextId as number | '');
                                if (nextId && usedManuscriptIds.includes(Number(nextId))) {
                                  setManuscriptSelectionError('This manuscript has already been used to create a paper. Please select another manuscript.');
                                } else {
                                  setManuscriptSelectionError('');
                                }
                              }}
                              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Choose ready manuscript --</option>
                              {readyManuscripts
                                .filter(manuscript =>
                                  manuscript.title.toLowerCase().includes(manuscriptSearch.toLowerCase())
                                )
                                .map(manuscript => (
                                  <option key={manuscript.id} value={manuscript.id}>
                                    {manuscript.title}
                                  </option>
                                ))}
                            </select>
                            {manuscriptSelectionError && (
                              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 shadow-sm">
                                {manuscriptSelectionError}
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedManuscript && (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                            <h4 className="font-semibold text-blue-900">Selected Manuscript</h4>
                            <p className="text-sm text-blue-800 mt-2">{selectedManuscript.title}</p>
                            <p className="text-sm text-blue-800 mt-1">Authors: {selectedManuscript.manual_authors || selectedManuscript.authors.map(a => a.full_name).join(', ')}</p>
                            <p className="text-sm text-blue-800 mt-1">Keywords: {selectedManuscript.keywords || 'N/A'}</p>
                            <p className="text-sm text-blue-800 mt-1">Abstract preview: {selectedManuscript.abstract ? `${selectedManuscript.abstract.slice(0, 120)}...` : 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="Title *"
                      value={paperForm.title}
                      onChange={e => setPaperForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Authors (comma separated) *"
                      value={paperForm.authors}
                      onChange={e => setPaperForm(prev => ({ ...prev, authors: e.target.value }))}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <textarea
                      placeholder="Abstract"
                      value={paperForm.abstract}
                      onChange={e => setPaperForm(prev => ({ ...prev, abstract: e.target.value }))}
                      className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Keywords (comma separated)"
                      value={paperForm.keywords}
                      onChange={e => setPaperForm(prev => ({ ...prev, keywords: e.target.value }))}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="grid md:grid-cols-2 gap-6">
                      <input
                        type="text"
                        placeholder="Pages (e.g. 1-15)"
                        value={paperForm.pages}
                        onChange={e => setPaperForm(prev => ({ ...prev, pages: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          DOI <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="DOI"
                          value={paperForm.doi}
                          onChange={e => {
                            setPaperForm(prev => ({ ...prev, doi: e.target.value }));
                            if (doiError) setDoiError('');
                          }}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        {doiError && (
                          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm">
                            {doiError}
                          </div>
                        )}
                      </div>
                    </div>
                    <label className="block">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium mb-2 block">Paper File (PDF/DOC){!editingPaper && !selectedManuscript ? ' *' : ''}</span>
                        {selectedManuscript && (
                          <span className="text-xs text-gray-500">Auto-loaded from selected manuscript if left empty</span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={e => setPaperForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                        className="w-full p-3 border rounded-lg"
                        required={!editingPaper && !selectedManuscript}
                      />
                      {paperForm.file && <p className="text-sm text-gray-600 mt-1">Selected: {paperForm.file.name}</p>}
                    </label>

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
                      >
                        {editingPaper ? 'Update Paper' : 'Add Paper'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPaper(null);
                          setShowPaperForm(false);
                          setPaperForm({ title: '', authors: '', abstract: '', keywords: '', pages: '', doi: '', file: null });
                        }}
                        className="px-8 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition shadow-md hover:shadow-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">
                    Papers in Issue {selectedIssue.number}
                  </h3>
                  <button
                    onClick={() => {
                      setPaperForm({ title: '', authors: '', abstract: '', keywords: '', pages: '', doi: '', file: null });
                      setEditingPaper(null);
                      setShowPaperForm(true);
                    }}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Plus size={18} />
                    New Paper
                  </button>
                </div>

                <div className="space-y-4">
                  {papers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No papers in this issue yet.
                    </p>
                  ) : (
                    papers.map(paper => (
                      <div key={paper.id} className="p-5 border rounded-lg hover:bg-gray-50 transition-all duration-200 hover:scale-105">
                        <h4 className="font-semibold text-lg">{paper.title}</h4>
                        <p className="text-gray-600 mt-1">Authors: {paper.authors}</p>
                        <p className="text-sm text-gray-500 mt-2">Pages: {paper.pages} | DOI: {paper.doi || 'N/A'}</p>
                        <div className="flex gap-4 mt-4">
                          <button
                            onClick={() => {
                              setEditingPaper(paper);
                              setPaperForm({
                                title: paper.title,
                                authors: paper.authors,
                                abstract: paper.abstract,
                                keywords: paper.keywords,
                                pages: paper.pages,
                                doi: paper.doi,
                                file: null,
                              });
                              setShowPaperForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Edit size={18} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeletePaper(paper.id)}
                            className="text-red-600 hover:text-red-800 flex items-center gap-1"
                          >
                            <Trash2 size={18} /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}