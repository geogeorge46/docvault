
import React, { useState, useEffect } from 'react';
import { XIcon } from './icons/XIcon';
import { useTranslation } from '../hooks/useTranslation';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialName?: string;
  isEditing?: boolean;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ isOpen, onClose, onSave, initialName = '', isEditing = false }) => {
  const [folderName, setFolderName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
      if (isOpen) {
          setFolderName(initialName);
          setError(null);
      }
  }, [isOpen, initialName]);

  const handleSubmit = () => {
    if (!folderName.trim()) {
      setError(t('folders.errorNoName'));
      return;
    }
    onSave(folderName.trim());
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">{isEditing ? t('folders.renameTitle') : t('folders.createTitle')}</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="folderName" className="block text-sm font-medium text-slate-700 mb-1">{t('folders.folderNameLabel')}</label>
            <input 
              id="folderName" 
              type="text" 
              value={folderName} 
              onChange={e => setFolderName(e.target.value)} 
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t('folders.folderNamePlaceholder')}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end space-x-3">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 hover:bg-slate-100 transition-colors">{t('uploadModal.cancel')}</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">{isEditing ? t('folders.updateButton') : t('folders.createButton')}</button>
        </div>
      </div>
    </div>
  );
};

export default CreateFolderModal;
