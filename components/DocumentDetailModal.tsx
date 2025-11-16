

import React from 'react';
import { Document, DocumentVersion } from '../types';
import { XIcon } from './icons/XIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { EyeIcon } from './icons/EyeIcon';
import { useTranslation } from '../hooks/useTranslation';

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
  onOpenFile: (version: DocumentVersion) => void;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({ isOpen, onClose, document, onOpenFile }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">{document.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">{t('documentDetailModal.title')}</h3>
          <ul className="space-y-4">
            {document.versions.map((version, index) => (
              <li key={version.versionId} className="p-4 bg-slate-50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-slate-100 transition-colors duration-200">
                <div className="flex-grow mb-3 sm:mb-0 sm:pr-4">
                  <p className="font-semibold text-slate-800">
                    {t('documentDetailModal.version', { versionNumber: document.versions.length - index })}
                    {index === 0 && <span className="ml-2 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">{t('documentDetailModal.latest')}</span>}
                  </p>
                  <p className="text-sm text-slate-500">{t('documentDetailModal.uploadedOn', { date: formatDate(version.uploadedAt) })}</p>
                  {version.versionNotes && <p className="text-sm text-slate-600 mt-1 italic">"{version.versionNotes}"</p>}
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                    <button
                        onClick={() => onOpenFile(version)}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
                        aria-label={`View version from ${formatDate(version.uploadedAt)}`}
                    >
                        <EyeIcon className="w-4 h-4 mr-2" />
                        {t('documentCard.view')}
                    </button>
                    <a 
                      href={version.fileDataUrl} 
                      download={version.fileName}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label={`Download version from ${formatDate(version.uploadedAt)}`}
                    >
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      {t('documentDetailModal.download')}
                    </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 hover:bg-slate-100 transition-colors">{t('documentDetailModal.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailModal;