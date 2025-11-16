import React, { useMemo } from 'react';
import { Document } from '../types';
import { FileIcon } from './icons/FileIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PdfIcon } from './icons/PdfIcon';
import { useTranslation } from '../hooks/useTranslation';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { EyeIcon } from './icons/EyeIcon';
import { ShareIcon } from './icons/ShareIcon';

interface DocumentCardProps {
  document: Document;
  onAddVersion: (docId: string) => void;
  onViewDetails: (doc: Document) => void;
  onDelete: (docId: string) => void;
}

const getFileSizeFromBase64 = (base64String: string): number => {
  if (!base64String || !base64String.includes(',')) return 0;
  const base64 = base64String.substring(base64String.indexOf(',') + 1);
  const padding = (base64.endsWith('==')) ? 2 : (base64.endsWith('=')) ? 1 : 0;
  return (base64.length * 3 / 4) - padding;
};

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes <= 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onAddVersion, onViewDetails, onDelete }) => {
  const latestVersion = document.versions[0];
  const { t } = useTranslation();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const handleDeleteClick = () => {
    if (window.confirm(t('documentCard.deleteConfirmation'))) {
        onDelete(document.id);
    }
  };

  const handleShareClick = async () => {
    if (!latestVersion) return;

    if (!navigator.share) {
      alert(t('documentCard.shareError'));
      return;
    }

    try {
      const response = await fetch(latestVersion.fileDataUrl);
      const blob = await response.blob();
      const file = new File([blob], latestVersion.fileName, { type: latestVersion.fileType });

      const shareData = {
        files: [file],
        title: document.name,
        text: `Latest version of ${document.name}`,
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else if (!navigator.canShare) {
        // If canShare is not supported, just try to share
        await navigator.share(shareData);
      } else {
        // canShare() returned false
        alert(t('documentCard.shareError'));
      }
    } catch (error: any) {
      // Don't show an alert to the user for AbortError (user cancellation)
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        alert(t('documentCard.shareError'));
      }
    }
  };

  const formattedFileSize = useMemo(() => {
    if (!latestVersion?.fileDataUrl) {
      return formatBytes(0);
    }
    const bytes = getFileSizeFromBase64(latestVersion.fileDataUrl);
    return formatBytes(bytes);
  }, [latestVersion?.fileDataUrl]);

  const isImage = latestVersion && latestVersion.fileType.startsWith('image/');
  const isPdf = latestVersion && latestVersion.fileType === 'application/pdf';

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden transform hover:-translate-y-1">
      <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden relative group">
        {isImage ? (
          <img 
            src={latestVersion.fileDataUrl} 
            alt={`Preview of ${document.name}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
          />
        ) : isPdf ? (
            <div className="flex flex-col items-center justify-center text-red-500">
                <PdfIcon className="w-16 h-16" />
                <span className="mt-2 text-xs font-bold uppercase tracking-wider">PDF</span>
            </div>
        ) : (
          <FileIcon className="w-16 h-16 text-slate-300" />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300 flex items-center justify-center p-4">
          {isPdf && (
            <a
              href={latestVersion.fileDataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-90 bg-white/90 text-slate-800 font-bold py-2 px-4 rounded-full inline-flex items-center shadow-lg"
              onClick={(e) => e.stopPropagation()} // Prevent card click-through
            >
              <EyeIcon className="w-5 h-5 mr-2" />
              <span>{t('documentCard.view')}</span>
            </a>
          )}
        </div>
      </div>

      <div className="p-4 flex-grow">
        <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-slate-800 pr-2">{document.name}</h2>
            <button onClick={handleDeleteClick} className="flex-shrink-0 text-slate-400 hover:text-red-500 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded hover:bg-slate-100 transition-colors" aria-label={t('aria.deleteDocument', { docName: document.name })}>{t('documentCard.delete')}</button>
        </div>
        <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center text-slate-500">
              <FileIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>
                {document.versions.length > 1
                  ? t('documentCard.versions_plural', { count: document.versions.length })
                  : t('documentCard.versions', { count: document.versions.length })
                }
              </span>
            </div>
            {latestVersion && (
              <>
                <div className="flex items-start text-slate-600" title={latestVersion.fileName}>
                  {isImage ? (
                    <img 
                      src={latestVersion.fileDataUrl} 
                      alt={t('documentCard.thumbnailAlt', { docName: document.name })} 
                      className="w-6 h-6 mr-2 flex-shrink-0 mt-0.5 rounded object-cover border border-slate-200" 
                    />
                  ) : (
                    <FileIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="truncate">{latestVersion.fileName}</span>
                </div>
                <div className="flex items-center text-slate-500">
                    <DatabaseIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{t('documentCard.fileSize', { size: formattedFileSize })}</span>
                </div>
                <div className="flex items-center text-slate-500">
                    <ClockIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{t('documentCard.lastUpdated', { date: formatDate(latestVersion.uploadedAt) })}</span>
                </div>
              </>
            )}
        </div>
      </div>
      <div className="bg-slate-50 p-2 grid grid-cols-3 gap-2">
        <button 
          onClick={() => onViewDetails(document)}
          className="text-sm font-semibold text-center text-indigo-600 hover:bg-indigo-100 py-2 px-3 rounded-md transition-colors"
        >
          {t('documentCard.viewDetails')}
        </button>
        <button
          onClick={handleShareClick}
          aria-label={t('aria.shareDocument', { docName: document.name })}
          className="text-sm font-semibold text-center text-indigo-600 hover:bg-indigo-100 py-2 px-3 rounded-md transition-colors flex items-center justify-center"
        >
          <ShareIcon className="w-4 h-4 mr-1.5" />
          {t('documentCard.share')}
        </button>
        <button 
          onClick={() => onAddVersion(document.id)}
          className="text-sm font-semibold text-center bg-indigo-600 text-white py-2 px-3 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {t('documentCard.addNewVersion')}
        </button>
      </div>
    </div>
  );
};

export default DocumentCard;