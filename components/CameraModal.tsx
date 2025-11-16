import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DocumentVersion, Folder } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';

// Props interface
interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (name: string, folderId: string | null, version: Omit<DocumentVersion, 'versionId' | 'uploadedAt'>) => void;
  folders: Folder[];
  currentFolderId: string | null;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onAddDocument, folders, currentFolderId }) => {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [view, setView] = useState<'capture' | 'form'>('capture');
    
    const [docName, setDocName] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const cleanup = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        if (isOpen) {
            const startStream = async () => {
                try {
                    const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: 'environment' } 
                    });
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                } catch (err) {
                    console.error("Camera access denied:", err);
                    setError(t('cameraModal.errorNoCamera'));
                }
            };
            startStream();
        } else {
            cleanup();
            // Reset state on close
            setCapturedImages([]);
            setView('capture');
            setDocName('');
            setError(null);
            setIsProcessing(false);
            setSelectedFolderId(currentFolderId);
        }

        return () => {
            if (isOpen) { // Ensure cleanup happens if component unmounts while open
                cleanup();
            }
        };
    }, [isOpen, t, cleanup, currentFolderId]);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setCapturedImages(prev => [...prev, imageDataUrl]);
        }
    };
    
    const handleDeleteImage = (index: number) => {
        setCapturedImages(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleSave = async () => {
        setError(null);
        if (!docName.trim()) {
            setError(t('cameraModal.errorNoName'));
            return;
        }
        if (capturedImages.length === 0) {
            setError(t('cameraModal.errorNoCapture'));
            return;
        }

        setIsProcessing(true);
        
        // Use a timeout to allow UI to update before blocking with PDF generation
        setTimeout(async () => {
            try {
                // @ts-ignore
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'pt', 'a4');
                const a4Width = 595.28;
                const a4Height = 841.89;
                
                for (let i = 0; i < capturedImages.length; i++) {
                    if (i > 0) {
                        pdf.addPage();
                    }
                    const imgData = capturedImages[i];
                    const img = new Image();
                    img.src = imgData;
                    await new Promise(resolve => { img.onload = resolve; });
                    
                    const imgWidth = img.width;
                    const imgHeight = img.height;
                    const ratio = Math.min(a4Width / imgWidth, a4Height / imgHeight);
                    
                    const pdfImgWidth = imgWidth * ratio;
                    const pdfImgHeight = imgHeight * ratio;
                    
                    const x = (a4Width - pdfImgWidth) / 2;
                    const y = (a4Height - pdfImgHeight) / 2;

                    pdf.addImage(imgData, 'JPEG', x, y, pdfImgWidth, pdfImgHeight);
                }
                
                const pdfDataUrl = pdf.output('datauristring');
                
                const newVersion = {
                    fileDataUrl: pdfDataUrl,
                    fileName: `${docName.trim()}.pdf`,
                    fileType: 'application/pdf',
                    versionNotes: `Scanned document with ${capturedImages.length} page(s).`,
                };

                onAddDocument(docName.trim(), selectedFolderId, newVersion);
                onClose();

            } catch (e) {
                console.error("Failed to generate PDF", e);
                setError("Failed to generate PDF. Please try again.");
                setIsProcessing(false);
            }
        }, 100);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <header className="flex-shrink-0 bg-slate-800 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">{t('cameraModal.title')}</h2>
                <button onClick={onClose} aria-label="Close">
                    <XIcon className="w-6 h-6" />
                </button>
            </header>
            
            <main className="flex-grow bg-slate-900 relative overflow-hidden">
                {error && !stream && (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <p className="text-white text-center bg-slate-800/50 p-4 rounded-lg">{error}</p>
                    </div>
                )}
                
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 ${view === 'form' ? 'opacity-0' : 'opacity-100'}`}
                />
                
                {view === 'form' && (
                    <div className="absolute inset-0 p-6 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-full max-w-sm bg-white p-6 rounded-lg space-y-4">
                            <h3 className="text-lg font-bold">{t('cameraModal.saveAsPdf')}</h3>
                            <div>
                                <label htmlFor="scannedDocName" className="block text-sm font-medium text-slate-700 mb-1">{t('cameraModal.docNameLabel')}</label>
                                <input 
                                  id="scannedDocName" 
                                  type="text" 
                                  value={docName} 
                                  onChange={e => setDocName(e.target.value)} 
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder={t('cameraModal.docNamePlaceholder')}
                                  autoFocus
                                />
                            </div>
                            <div>
                                <label htmlFor="scannedFolderSelect" className="block text-sm font-medium text-slate-700 mb-1">{t('folders.assignTo')}</label>
                                <select
                                    id="scannedFolderSelect"
                                    value={selectedFolderId || ''}
                                    onChange={e => setSelectedFolderId(e.target.value || null)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">{t('folders.none')}</option>
                                    {folders.map(folder => (
                                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                                    ))}
                                </select>
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <div className="flex justify-end space-x-3 pt-2">
                                <button onClick={() => setView('capture')} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 hover:bg-slate-100 transition-colors" disabled={isProcessing}>
                                    {t('uploadModal.cancel')}
                                </button>
                                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-400 disabled:cursor-wait" disabled={isProcessing}>
                                    {isProcessing ? '...' : t('uploadModal.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                <canvas ref={canvasRef} className="hidden" />
            </main>
            
            <footer className="flex-shrink-0 bg-slate-800 p-4">
                <div className="mb-4 h-24 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                    {capturedImages.length > 0 ? (
                        capturedImages.map((imgSrc, index) => (
                            <div key={index} className="relative inline-block w-20 h-20 mr-2 border-2 border-slate-500 rounded-md overflow-hidden align-top">
                                <img src={imgSrc} alt={`Capture ${index + 1}`} className="w-full h-full object-cover" />
                                <button onClick={() => handleDeleteImage(index)} className="absolute top-0.5 right-0.5 p-0.5 bg-red-600/80 text-white rounded-full">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                                <span className="absolute bottom-0 left-0 right-0 text-center text-xs text-white bg-black/50 py-0.5">{index + 1}</span>
                            </div>
                        ))
                    ) : (
                         <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            {t('cameraModal.pages')}
                         </div>
                    )}
                </div>
                <div className="flex items-center justify-center space-x-6">
                    <div className="w-24"></div>
                     <button
                        onClick={handleCapture}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-slate-500 hover:ring-slate-400 transition-all"
                        aria-label={t('cameraModal.capturePage')}
                      >
                         <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-800"></div>
                     </button>
                    <div className="w-24">
                        {capturedImages.length > 0 && (
                            <button onClick={() => setView('form')} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                               {t(capturedImages.length > 1 ? 'cameraModal.save_plural' : 'cameraModal.save', { count: capturedImages.length })}
                            </button>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default CameraModal;