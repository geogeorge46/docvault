
import React from 'react';
import { DocumentVersion } from '../types';
import { XIcon } from './icons/XIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { useTranslation } from '../hooks/useTranslation';

interface FileViewerModalProps {
  version: DocumentVersion;
  onClose: () => void;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({ version, onClose }) => {
  const { t } = useTranslation();

  const isImage = version.fileType.startsWith('image/');
  const isPdf = version.fileType === 'application/pdf';

  const renderContent = () => {
    if (isImage) {
      return (
        <img 
          src={version.fileDataUrl} 
          alt={`Preview of ${version.fileName}`} 
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      );
    }
    if (isPdf) {
      return (
        <iframe 
          src={version.fileDataUrl} 
          title={version.fileName}
          className="w-full h-full border-0 rounded-lg"
        />
      );
    }
    // Fallback for other file types
    return (
      <div className="text-center bg-slate-800 text-white p-8 rounded-lg">
        <h3 className="text-xl font-semibold mb-2">{t('fileViewer.noPreviewTitle')}</h3>
        <p className="mb-4 text-slate-300">{t('fileViewer.noPreviewDescription', { fileName: version.fileName })}</p>
        <a 
          href={version.fileDataUrl} 
          download={version.fileName}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
        >
          <DownloadIcon className="w-4 h-4 mr-2" />
          {t('documentDetailModal.download')}
        </a>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="file-viewer-title" onClick={onClose}>
      {/* Top bar with filename and buttons */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent text-white z-20">
          <h3 id="file-viewer-title" className="text-lg font-semibold truncate pr-4" title={version.fileName}>{version.fileName}</h3>
          <div className="flex items-center space-x-2">
              <a 
                href={version.fileDataUrl} 
                download={version.fileName}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                aria-label={t('documentDetailModal.download')}
                title={t('documentDetailModal.download')}
                onClick={e => e.stopPropagation()} // Prevent modal close
              >
                <DownloadIcon className="w-6 h-6" />
              </a>
              <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors" aria-label="Close viewer">
                  <XIcon className="w-6 h-6" />
              </button>
          </div>
      </div>
      
      {/* Main Content container */}
      <div 
        className="relative w-full h-full flex items-center justify-center pt-16 pb-4"
        onClick={e => e.stopPropagation()}
      >
        <div className={`relative ${isPdf ? 'w-full h-full' : 'max-w-full max-h-full'}`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;
