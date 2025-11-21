
import React, { useMemo, useEffect, useState, useRef } from 'react';
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
import { getFileSizeFromBase64, formatBytes } from '../utils/fileUtils';

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

interface DocumentCardProps {
  document: Document;
  onAddVersion: (docId: string) => void;
  onViewDetails: (doc: Document) => void;
  onDelete: (docId: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onAddVersion, onViewDetails, onDelete }) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfThumbnail, setPdfThumbnail] = useState<string | null>(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);

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

    // Generate PDF Thumbnail
    useEffect(() => {
        let isCancelled = false;

        if (latestVersion.fileType === 'application/pdf') {
            const generatePdfThumbnail = async () => {
                if (!window.pdfjsLib) return;
                
                setIsLoadingPdf(true);
                try {
                    // Configure worker
                    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    }

                    // Robustly decode base64
                    const commaIndex = latestVersion.fileDataUrl.indexOf(',');
                    const base64Data = commaIndex !== -1 
                        ? latestVersion.fileDataUrl.substring(commaIndex + 1) 
                        : latestVersion.fileDataUrl;
                    
                    // Remove any whitespace/newlines which might cause atob to fail
                    const cleanBase64 = base64Data.replace(/[\n\r\s]/g, '');

                    if (!cleanBase64) throw new Error("Empty Data URL");

                    const binaryString = window.atob(cleanBase64);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    // Check for PDF header signature to prevent "Invalid PDF structure" error
                    const headerBytes = bytes.subarray(0, 20);
                    const headerString = String.fromCharCode(...headerBytes);
                    // PDF files start with %PDF-
                    if (!headerString.includes('%PDF-')) {
                        console.warn("Invalid PDF structure: Missing %PDF header", headerString);
                        // Don't throw here, just return to avoid showing broken state, fallback icon will show
                        return;
                    }

                    if (isCancelled) return;

                    // IMPORTANT: Pass object with { data: bytes } for Uint8Array
                    // Also add cmaps to ensure text renders or at least doesn't crash on missing fonts
                    const loadingTask = window.pdfjsLib.getDocument({ 
                        data: bytes,
                        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                        cMapPacked: true,
                        verbosity: 0 // Suppress warnings
                    });
                    const pdf = await loadingTask.promise;

                    if (isCancelled) return;

                    const page = await pdf.getPage(1);

                    if (isCancelled) return;

                    const viewport = page.getViewport({ scale: 1.0 }); // Standard scale for thumbnail
                    
                    // Use window.document to avoid shadowing issues
                    const canvas = window.document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    // Scale down if huge
                    const MAX_THUMB_DIM = 500;
                    let scale = 1;
                    if (viewport.width > MAX_THUMB_DIM || viewport.height > MAX_THUMB_DIM) {
                        scale = Math.min(MAX_THUMB_DIM / viewport.width, MAX_THUMB_DIM / viewport.height);
                    }
                    
                    const scaledViewport = page.getViewport({ scale });

                    canvas.height = scaledViewport.height;
                    canvas.width = scaledViewport.width;

                    if (context) {
                        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
                        if (!isCancelled) {
                            setPdfThumbnail(canvas.toDataURL('image/jpeg', 0.8));
                        }
                    }
                } catch (error: any) {
                    // Handle specific PDF errors gracefully without polluting console with Errors
                    if (error.name === 'InvalidPDFException' || (error.message && error.message.includes('Invalid PDF structure'))) {
                        console.warn("PDF Thumbnail skipped: Invalid PDF structure.");
                    } else {
                        console.error("Error rendering PDF thumbnail:", error);
                    }
                    // If error occurs, the icon fallback will show automatically
                } finally {
                    if (!isCancelled) setIsLoadingPdf(false);
                }
            };

            generatePdfThumbnail();
        } else {
            setPdfThumbnail(null);
        }

        return () => {
            isCancelled = true;
        };
    }, [latestVersion.fileDataUrl, latestVersion.fileType]);

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

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'DOCUMENT', id: document.id }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const renderPreview = () => {
        const fileType = latestVersion.fileType;
        
        // IMAGE PREVIEW
        if (fileType.startsWith('image/')) {
            return (
                <div className="relative group flex-grow rounded-t-lg overflow-hidden aspect-video bg-slate-200">
                    <img 
                        src={latestVersion.fileDataUrl} 
                        alt={t('documentCard.thumbnailAlt', { docName: document.name })} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        loading="lazy"
                    />
                    <a 
                        href={latestVersion.fileDataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer"
                    >
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900/80 text-white px-4 py-2 rounded-full flex items-center shadow-lg backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0">
                             <EyeIcon className="w-4 h-4 mr-2" />
                             <span className="font-medium text-sm">{t('documentCard.view')}</span>
                        </div>
                    </a>
                </div>
            );
        }

        // PDF PREVIEW
        if (fileType === 'application/pdf') {
            if (pdfThumbnail) {
                return (
                    <div className="relative group flex-grow rounded-t-lg overflow-hidden aspect-video bg-slate-200">
                        <img 
                            src={pdfThumbnail} 
                            alt={`PDF Preview of ${document.name}`}
                            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" 
                        />
                        <a 
                            href={latestVersion.fileDataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer"
                        >
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900/80 text-white px-4 py-2 rounded-full flex items-center shadow-lg backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0">
                                 <EyeIcon className="w-4 h-4 mr-2" />
                                 <span className="font-medium text-sm">{t('documentCard.view')}</span>
                            </div>
                        </a>
                    </div>
                );
            } else {
                 return (
                    <div className="relative group flex-grow flex items-center justify-center bg-slate-100 rounded-t-lg overflow-hidden aspect-video">
                        {isLoadingPdf ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                                <span className="text-xs text-slate-500">Loading Preview...</span>
                            </div>
                        ) : (
                            <PdfIcon className="w-20 h-20 text-red-200 group-hover:scale-110 transition-transform duration-300" />
                        )}
                        <a 
                            href={latestVersion.fileDataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 z-10"
                        >
                            <span className="sr-only">{t('documentCard.view')}</span>
                        </a>
                    </div>
                );
            }
        }

        // ZIP / GENERIC PREVIEW
        switch (fileType) {
            case 'application/zip':
            case 'application/x-zip-compressed':
                return (
                    <div className="relative group flex-grow flex items-center justify-center bg-indigo-50 rounded-t-lg overflow-hidden aspect-video">
                        <ZipIcon className="w-20 h-20 text-indigo-300 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                );
            default:
                return (
                    <div className="relative group flex-grow flex items-center justify-center bg-slate-100 rounded-t-lg overflow-hidden aspect-video">
                        <FileIcon className="w-20 h-20 text-slate-300 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                );
        }
    };

    const renderTypeIcon = () => {
        const fileType = latestVersion.fileType;
        if (fileType.startsWith('image/')) {
             return (
                <img 
                    src={latestVersion.fileDataUrl} 
                    alt={t('documentCard.thumbnailAlt', { docName: document.name })}
                    className="w-10 h-10 object-cover rounded-md border border-slate-200"
                />
            );
        }

        if (fileType === 'application/pdf') {
            return (
                <div className="w-10 h-10 flex items-center justify-center rounded-md border border-slate-200 bg-red-50">
                    <PdfIcon className="w-6 h-6 text-red-500" />
                </div>
            );
        } else if (fileType === 'application/zip' || fileType === 'application/x-zip-compressed') {
             return (
                <div className="w-10 h-10 flex items-center justify-center rounded-md border border-slate-200 bg-yellow-50">
                    <ZipIcon className="w-6 h-6 text-yellow-600" />
                </div>
            );
        }

        return (
            <div className="w-10 h-10 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                <FileIcon className="w-6 h-6 text-slate-400" />
            </div>
        );
    }

    return (
        <div 
            draggable
            onDragStart={handleDragStart}
            className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col"
        >
            {renderPreview()}
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex items-start justify-between">
                    <h3 className="font-bold text-lg text-slate-800 mb-2 flex-1 pr-2 break-words" title={document.name}>
                        {document.name}
                    </h3>
                    {renderTypeIcon()}
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
    