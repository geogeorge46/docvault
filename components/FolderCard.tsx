

import React from 'react';
import { Folder } from '../types';
import { FolderIcon } from './icons/FolderIcon';
import { useTranslation } from '../hooks/useTranslation';

interface FolderCardProps {
    folder: Folder;
    documentCount: number;
    onClick: () => void;
    onDelete: (folderId: string) => void;
}

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.077-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

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