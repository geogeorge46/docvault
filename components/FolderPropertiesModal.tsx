
import React from 'react';
import { Folder } from '../types';
import { XIcon } from './icons/XIcon';
import { FolderIcon } from './icons/FolderIcon';
import { useTranslation } from '../hooks/useTranslation';
import { formatBytes } from '../utils/fileUtils';

interface FolderPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: Folder;
  documentCount: number;
  totalSize: number;
}

const FolderPropertiesModal: React.FC<FolderPropertiesModalProps> = ({ isOpen, onClose, folder, documentCount, totalSize }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">{t('folderProperties.title')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6">
            <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                    <FolderIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 text-center">{folder.name}</h3>
            </div>
            
            <div className="space-y-4">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500 text-sm">{t('folderProperties.created')}</span>
                    <span className="text-slate-800 text-sm font-medium">{formatDate(folder.createdAt)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500 text-sm">{t('folderProperties.itemCount')}</span>
                    <span className="text-slate-800 text-sm font-medium">{documentCount}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500 text-sm">{t('folderProperties.totalSize')}</span>
                    <span className="text-slate-800 text-sm font-medium">{formatBytes(totalSize)}</span>
                </div>
            </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">
            {t('folderProperties.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderPropertiesModal;
