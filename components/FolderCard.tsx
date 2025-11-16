


import React from 'react';
import { Folder } from '../types';
import { FolderIcon } from './icons/FolderIcon';
import { useTranslation } from '../hooks/useTranslation';
import { TrashIcon } from './icons/TrashIcon';

interface FolderCardProps {
    folder: Folder;
    documentCount: number;
    onClick: () => void;
    onDelete: (folderId: string) => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ folder, documentCount, onClick, onDelete }) => {
    const { t } = useTranslation();

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the main onClick from firing
        onDelete(folder.id);
    };

    return (
        <div 
            onClick={onClick}
            className="relative group bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center justify-center p-4 aspect-square cursor-pointer transform hover:-translate-y-1"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
            aria-label={`Open folder ${folder.name}`}
        >
            <button
                onClick={handleDeleteClick}
                className="absolute top-2 right-2 p-1.5 bg-slate-100/50 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all z-10"
                aria-label={t('aria.deleteFolder', { folderName: folder.name })}
            >
                <TrashIcon className="w-5 h-5" />
            </button>
            <FolderIcon className="w-16 h-16 text-indigo-500 mb-2" />
            <h3 className="text-md font-bold text-center text-slate-800 truncate w-full" title={folder.name}>
                {folder.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
                {documentCount} {documentCount === 1 ? 'item' : 'items'}
            </p>
        </div>
    );
};

export default FolderCard;