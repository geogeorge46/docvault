
import React from 'react';
import { Folder } from '../types';
import { FolderIcon } from './icons/FolderIcon';

interface FolderCardProps {
    folder: Folder;
    documentCount: number;
    onClick: () => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ folder, documentCount, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center justify-center p-4 aspect-square cursor-pointer transform hover:-translate-y-1"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
            aria-label={`Open folder ${folder.name}`}
        >
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