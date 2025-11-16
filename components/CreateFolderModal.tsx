
import React, { useState } from 'react';
import { XIcon } from './icons/XIcon';
import { useTranslation } from '../hooks/useTranslation';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFolder: (name: string) => void;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ isOpen, onClose, onAddFolder }) => {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleSubmit = () => {
    if (!folderName.trim()) {
      setError(t('folders.errorNoName'));
      return;
    }
    onAddFolder(folderName.trim());
    setFolderName('');
    setError(null);
  };
  
  const handleClose = () => {
      setFolderName('');
      setError(null);
      onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">{t('folders.createTitle')}</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="folderName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('folders.folderNameLabel')}</label>
            <input 
              id="folderName" 
              type="text" 
              value={folderName} 
              onChange={e => setFolderName(e.target.value)} 
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t('folders.folderNamePlaceholder')}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex justify-end space-x-3">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">{t('uploadModal.cancel')}</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:ring-offset-slate-800 transition-colors">{t('folders.createButton')}</button>
        </div>
      </div>
    </div>
  );
};

export default CreateFolderModal;
