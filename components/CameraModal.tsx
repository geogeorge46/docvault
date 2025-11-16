import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DocumentVersion, Folder } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';

// Add JSZip and ImageCapture to the window interface
declare global {
    interface Window {
        jspdf: any;
        JSZip: any;
        ImageCapture: any;
    }
}

// Props interface
interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (name: string, folderId: string | null, version: Omit<DocumentVersion, 'versionId' | 'uploadedAt'>) => void;
  folders: Folder[];
  currentFolderId: string | null;
}

type ProcessingState = 'idle' | 'pdf' | 'zip';
type CameraStatus = 'initializing' | 'ready' | 'error';

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onAddDocument, folders, currentFolderId }) => {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageCaptureRef = useRef<any>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [view, setView] = useState<'capture' | 'form'>('capture');
    
    const [docName, setDocName] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
    const [error, setError] = useState<string | null>(null);
    const [processingState, setProcessingState] = useState<ProcessingState>('idle');
    const [cameraStatus, setCameraStatus] = useState<CameraStatus>('initializing');
    const [shutterEffect, setShutterEffect] = useState(false);


    const cleanup = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        imageCaptureRef.current = null;
    }, [stream]);

    useEffect(() => {
        const videoElement = videoRef.current;
    
        if (isOpen) {
            setCameraStatus('initializing');
    
            const startStream = async () => {
                try {
                    // Removed specific width/height to maximize compatibility and prevent timeouts on some devices.
                    const mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { 
                            facingMode: 'environment'
                        }
                    });
                    setStream(mediaStream);
    
                    if (videoElement) {
                        videoElement.srcObject = mediaStream;
                        // onloadeddata fires when the first frame is available, which is faster than oncanplay.
                        videoElement.onloadeddata = () => {
                            videoElement.play().catch(err => {
                                console.error("Video play failed:", err);
                                setError("Could not play video stream.");
                                setCameraStatus('error');
                            });
    
                            if (typeof window.ImageCapture !== 'undefined') {
                                try {
                                    const track = mediaStream.getVideoTracks()[0];
                                    if(track) {
                                        imageCaptureRef.current = new window.ImageCapture(track);
                                    }
                                } catch (e) {
                                    console.error("ImageCapture initialization failed: ", e);
                                    imageCaptureRef.current = null;
                                }
                            } else {
                                imageCaptureRef.current = null;
                            }
                            setCameraStatus('ready');
                        };
                    }
                } catch (err: any) {
                    console.error(`Camera access failed with ${err.name}:`, err);
                    setError(t('cameraModal.errorNoCamera'));
                    setCameraStatus('error');
                }
            };
            startStream();
        } else {
            cleanup();
            setCapturedImages([]);
            setView('capture');
            setDocName('');
            setError(null);
            setProcessingState('idle');
            setShutterEffect(false);
            setSelectedFolderId(currentFolderId);
            setCameraStatus('initializing');
        }
    
        return () => {
            if (videoElement) {
                videoElement.onloadeddata = null;
            }
            if (isOpen) {
                cleanup();
            }
        };
    }, [isOpen, t, cleanup, currentFolderId]);

    const handleCapture = useCallback(async () => {
        if (cameraStatus !== 'ready' || !stream?.active) return;
    
        setShutterEffect(true);
        setTimeout(() => setShutterEffect(false), 100);
    
        try {
            let imageDataUrl: string;
    
            if (imageCaptureRef.current) {
                const blob = await imageCaptureRef.current.takePhoto();
                imageDataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } else {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || !canvas) throw new Error("Video or canvas ref not available.");
                
                // Use a stricter check: HAVE_FUTURE_DATA (3) means we have the current frame and the next one.
                if (video.readyState < 3 || video.videoWidth === 0) {
                    throw new Error("Video stream is not ready for capture.");
                }

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext('2d');
                if (!context) throw new Error("Could not get canvas context.");
                
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            }
    
            if (imageDataUrl && imageDataUrl !== 'data:,') {
                setCapturedImages(prev => [...prev, imageDataUrl]);
            } else {
                throw new Error("Image capture resulted in empty data.");
            }
    
        } catch (e) {
            console.error("Capture failed:", e);
            setError("Failed to capture image. Please try again.");
        }
    }, [stream, cameraStatus]);
    
    const handleDeleteImage = (index: number) => {
        setCapturedImages(prev => prev.filter((_, i) => i !== index));
    };
    
    const validateForm = (): boolean => {
        setError(null);
        if (!docName.trim()) {
            setError(t('cameraModal.errorNoName'));
            return false;
        }
        if (capturedImages.length === 0) {
            setError(t('cameraModal.errorNoCapture'));
            return false;
        }
        return true;
    }

    const handleSaveAsPdf = async () => {
        if (!validateForm()) return;

        setProcessingState('pdf');
        
        setTimeout(async () => {
            try {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'pt', 'a4');
                const a4Width = 595.28;
                const a4Height = 841.89;
                
                for (let i = 0; i < capturedImages.length; i++) {
                    if (i > 0) pdf.addPage();
                    const imgData = capturedImages[i];
                    const img = new Image();
                    img.src = imgData;
                    await new Promise(resolve => { img.onload = resolve; });
                    
                    const ratio = Math.min(a4Width / img.width, a4Height / img.height);
                    const pdfImgWidth = img.width * ratio;
                    const pdfImgHeight = img.height * ratio;
                    const x = (a4Width - pdfImgWidth) / 2;
                    const y = (a4Height - pdfImgHeight) / 2;

                    pdf.addImage(imgData, 'JPEG', x, y, pdfImgWidth, pdfImgHeight);
                }
                
                const pdfDataUrl = pdf.output('datauristring');
                
                onAddDocument(docName.trim(), selectedFolderId, {
                    fileDataUrl: pdfDataUrl,
                    fileName: `${docName.trim()}.pdf`,
                    fileType: 'application/pdf',
                    versionNotes: `Scanned document with ${capturedImages.length} page(s).`,
                });
                onClose();

            } catch (e) {
                console.error("Failed to generate PDF", e);
                setError("Failed to generate PDF. Please try again.");
                setProcessingState('idle');
            }
        }, 100);
    };

    const handleSaveAsZip = async () => {
        if (!validateForm()) return;
        
        setProcessingState('zip');

        setTimeout(async () => {
            try {
                const zip = new window.JSZip();
                capturedImages.forEach((imgDataUrl, index) => {
                    // Strip the data URL prefix to get pure base64
                    const base64Data = imgDataUrl.split(',')[1];
                    zip.file(`page_${index + 1}.jpg`, base64Data, { base64: true });
                });

                const zipBase64 = await zip.generateAsync({ type: 'base64' });
                const zipDataUrl = `data:application/zip;base64,${zipBase64}`;

                onAddDocument(docName.trim(), selectedFolderId, {
                    fileDataUrl: zipDataUrl,
                    fileName: `${docName.trim()}.zip`,
                    fileType: 'application/zip',
                    versionNotes: `ZIP archive with ${capturedImages.length} scanned page(s).`,
                });
                onClose();

            } catch (e) {
                console.error("Failed to generate ZIP", e);
                setError("Failed to generate ZIP. Please try again.");
                setProcessingState('idle');
            }
        }, 100);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <header className="flex-shrink-0 bg-slate-800 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">{t('cameraModal.title')}</h2>
                <button onClick={onClose} aria-label="Close">
                    <XIcon className="w-6 h-6" />
                </button>
            </header>
            
            <main className="flex-grow bg-slate-900 relative overflow-hidden flex items-center justify-center">
                {cameraStatus === 'initializing' && <p className="text-white animate-pulse">Initializing Camera...</p>}
                
                {cameraStatus === 'error' && (
                    <div className="p-4">
                        <p className="text-white text-center bg-red-900/50 p-4 rounded-lg">{error}</p>
                    </div>
                )}
                
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`absolute top-0 left-0 w-full h-full object-cover transform-gpu transition-opacity duration-300 ${view === 'form' || cameraStatus !== 'ready' ? 'opacity-0' : 'opacity-100'}`}
                />

                {/* Shutter Effect Overlay */}
                <div className={`absolute inset-0 bg-white/80 transition-opacity duration-100 z-10 ${shutterEffect ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
                
                {view === 'form' && (
                    <div className="absolute inset-0 p-4 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-full max-w-sm bg-white p-6 rounded-lg">
                            <h3 className="text-lg font-bold mb-4">{t('cameraModal.saveOptionsTitle')}</h3>
                            <div className="space-y-4">
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
                            </div>

                            <div className="space-y-3 pt-6">
                                <button
                                    onClick={handleSaveAsPdf}
                                    disabled={processingState !== 'idle'}
                                    className="w-full text-left p-4 border border-slate-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-wait"
                                >
                                    <div className="font-semibold text-slate-800">{t('cameraModal.saveAsPdf')}</div>
                                    <div className="text-sm text-slate-500">{t('cameraModal.pdfDescription')}</div>
                                    {processingState === 'pdf' && <div className="text-sm text-indigo-600 mt-1 animate-pulse">{t('cameraModal.savingPdf')}</div>}
                                </button>
                                <button
                                    onClick={handleSaveAsZip}
                                    disabled={processingState !== 'idle'}
                                    className="w-full text-left p-4 border border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait"
                                >
                                    <div className="font-semibold text-slate-800">{t('cameraModal.saveAsZip')}</div>
                                    <div className="text-sm text-slate-500">{t('cameraModal.zipDescription')}</div>
                                    {processingState === 'zip' && <div className="text-sm text-blue-600 mt-1 animate-pulse">{t('cameraModal.savingZip')}</div>}
                                </button>
                            </div>
                            <div className="flex justify-end pt-6">
                                <button onClick={() => setView('capture')} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 hover:bg-slate-100 transition-colors" disabled={processingState !== 'idle'}>
                                    {t('cameraModal.backToCapture')}
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
                        disabled={cameraStatus !== 'ready'}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-slate-500 hover:ring-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:ring-slate-700"
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