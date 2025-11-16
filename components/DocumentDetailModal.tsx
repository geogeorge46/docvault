import React from 'react';
import { Document } from '../types';
import { XIcon } from './icons/XIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { useTranslation } from '../hooks/useTranslation';

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({ isOpen, onClose, document }) => {
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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{document.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">{t('documentDetailModal.title')}</h3>
          <ul className="space-y-4">
            {document.versions.map((version, index) => (
              <li key={version.versionId} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200">
                <div className="flex-grow mb-3 sm:mb-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {t('documentDetailModal.version', { versionNumber: document.versions.length - index })}
                    {index === 0 && <span className="ml-2 text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">{t('documentDetailModal.latest')}</span>}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('documentDetailModal.uploadedOn', { date: formatDate(version.uploadedAt) })}</p>
                  {version.versionNotes && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 italic">"{version.versionNotes}"</p>}
                </div>
                <a 
                  href={version.fileDataUrl} 
                  download={version.fileName}
                  className="flex-shrink-0 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-slate-800"
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  {t('documentDetailModal.download')}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex justify-end border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">{t('documentDetailModal.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailModal;
