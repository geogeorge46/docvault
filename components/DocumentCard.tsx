

import React, { useMemo } from 'react';
import { Document } from '../types';
import { FileIcon } from './icons/FileIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PdfIcon } from './icons/PdfIcon';
import { useTranslation } from '../hooks/useTranslation';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { EyeIcon } from './icons/EyeIcon';
import { ShareIcon } from './icons/ShareIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ZipIcon } from './icons/ZipIcon';

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
    const { t } = useTranslation();

    const latestVersion = useMemo(() => document.versions[0], [document.versions]);

    const lastUpdatedDate = useMemo(() => {
        return new Date(latestVersion.uploadedAt).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }, [latestVersion.uploadedAt]);

    const fileSize = useMemo(() => {
        const bytes = getFileSizeFromBase64(latestVersion.fileDataUrl);
        return formatBytes(bytes);
    }, [latestVersion.fileDataUrl]);

    const handleDelete = () => {
        if (window.confirm(t('documentCard.deleteConfirmation'))) {
            onDelete(document.id);
        }
    };

    const handleShare = async () => {
        try {
            const response = await fetch(latestVersion.fileDataUrl);
            const blob = await response.blob();
            const file = new File([blob], latestVersion.fileName, { type: latestVersion.fileType });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: document.name,
                });
            } else {
                throw new Error('Share API not supported');
            }
        } catch (error) {
            console.error('Share failed:', error);
            alert(t('documentCard.shareError'));
        }
    };

    const renderPreview = () => {
        const fileType = latestVersion.fileType;
        if (fileType.startsWith('image/')) {
            return (
                <div className="relative group flex-grow rounded-t-lg overflow-hidden aspect-video bg-slate-200">
                    <img src={latestVersion.fileDataUrl} alt={t('documentCard.thumbnailAlt', { docName: document.name })} className="w-full h-full object-cover" />
                </div>
            );
        }

        switch (fileType) {
            case 'application/pdf':
                return (
                    <a
                        href={latestVersion.fileDataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('aria.viewDocument', { docName: document.name })}
                        className="relative group flex-grow flex items-center justify-center bg-slate-200/50 rounded-t-lg overflow-hidden aspect-video cursor-pointer"
                    >
                        <PdfIcon className="w-24 h-24 text-slate-400" />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="flex items-center text-white font-bold text-lg">
                                <EyeIcon className="w-6 h-6 mr-2" />
                                {t('documentCard.view')}
                            </div>
                        </div>
                    </a>
                );
            case 'application/zip':
            case 'application/x-zip-compressed':
                return (
                    <div className="relative group flex-grow flex items-center justify-center bg-slate-200/50 rounded-t-lg overflow-hidden aspect-video">
                        <ZipIcon className="w-20 h-20 text-slate-400" />
                    </div>
                );
            default:
                return (
                    <div className="relative group flex-grow flex items-center justify-center bg-slate-200/50 rounded-t-lg overflow-hidden aspect-video">
                        <FileIcon className="w-20 h-20 text-slate-400" />
                    </div>
                );
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
            {renderPreview()}
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex items-start justify-between">
                    <h3 className="font-bold text-lg text-slate-800 mb-2 flex-1 pr-2" title={document.name}>
                        {document.name}
                    </h3>
                    {latestVersion.fileType.startsWith('image/') && (
                        <img 
                            src={latestVersion.fileDataUrl} 
                            alt={t('documentCard.thumbnailAlt', { docName: document.name })}
                            className="w-10 h-10 object-cover rounded-md border border-slate-200"
                        />
                    )}
                </div>
                <div className="space-y-2 mt-auto text-xs text-slate-500">
                    <div className="flex items-center">
                        <ClockIcon className="w-3.5 h-3.5 mr-1.5" />
                        <span>{t('documentCard.lastUpdated', { date: lastUpdatedDate })}</span>
                    </div>
                    <div className="flex items-center">
                        <DatabaseIcon className="w-3.5 h-3.5 mr-1.5" />
                        <span>{t('documentCard.fileSize', { size: fileSize })} | {t(document.versions.length > 1 ? 'documentCard.versions_plural' : 'documentCard.versions', { count: document.versions.length })}</span>
                    </div>
                </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm font-medium">
                <div className="flex items-center space-x-2">
                    <button onClick={() => onViewDetails(document)} className="text-indigo-600 hover:underline">{t('documentCard.viewDetails')}</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => onAddVersion(document.id)} className="text-indigo-600 hover:underline">{t('documentCard.addNewVersion')}</button>
                </div>
                <div className="flex items-center space-x-2">
                    <a
                        href={latestVersion.fileDataUrl}
                        download={latestVersion.fileName}
                        aria-label={t('aria.downloadDocument', { docName: document.name })}
                        className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </a>
                    <button onClick={handleShare} aria-label={t('aria.shareDocument', { docName: document.name })} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                        <ShareIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handleDelete} aria-label={t('aria.deleteDocument', { docName: document.name })} className="p-1.5 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                       <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentCard;