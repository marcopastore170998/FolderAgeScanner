import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  FileText, 
  AlertTriangle, 
  Calendar, 
  HardDrive 
} from 'lucide-react';
import { FolderTreeNode } from '../types';
import { formatBytes, formatDateTime } from '../services/folderScanner';

interface Props {
  node: FolderTreeNode;
  cutoffYear: number;
  level?: number;
  expandedMap: Record<string, boolean>;
  onToggleExpand: (path: string) => void;
  filterOnlyRed: boolean;
  searchFilter: string;
}

export const FolderTreeItem: React.FC<Props> = ({
  node,
  cutoffYear,
  level = 0,
  expandedMap,
  onToggleExpand,
  filterOnlyRed,
  searchFilter,
}) => {
  const [showFiles, setShowFiles] = useState(false);
  const isExpanded = !!expandedMap[node.path];

  // Check search filtering
  const matchesSearch = !searchFilter || 
    node.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    node.path.toLowerCase().includes(searchFilter.toLowerCase());

  function hasMatchingDescendant(item: FolderTreeNode): boolean {
    if (filterOnlyRed && (item.isRed || item.isOrange)) return true;
    if (searchFilter && item.name.toLowerCase().includes(searchFilter.toLowerCase())) return true;
    return item.children.some(child => hasMatchingDescendant(child));
  }

  if (filterOnlyRed && !node.isRed && !node.isOrange && !hasMatchingDescendant(node)) {
    return null;
  }

  if (searchFilter && !matchesSearch && !hasMatchingDescendant(node)) {
    return null;
  }

  const hasChildren = node.children.length > 0;
  const isRed = node.isRed;
  const isOrange = node.isOrange;

  return (
    <div className="select-none text-sm font-sans">
      <div
        className={`group flex items-center justify-between py-2 px-3 my-0.5 rounded-lg border transition-all duration-150 ${
          isRed
            ? 'bg-red-950/40 border-red-700/60 text-red-200 hover:bg-red-950/60 shadow-xs'
            : isOrange
            ? 'bg-amber-950/30 border-amber-600/50 text-amber-200 hover:bg-amber-950/50 shadow-xs'
            : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-700'
        }`}
        style={{ paddingLeft: `${Math.max(12, level * 22 + 10)}px` }}
      >
        {/* Left: Folders and Expand/Collapse Icon */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-4">
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(node.path)}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none cursor-pointer"
              title={isExpanded ? 'Comprimi cartella' : 'Espandi cartella'}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-300" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Folder Icon */}
          <div className="shrink-0">
            {isRed ? (
              <div className="relative">
                <Folder className="w-5 h-5 text-red-500 fill-red-950/60" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-zinc-950 animate-pulse" />
              </div>
            ) : isOrange ? (
              <div className="relative">
                {isExpanded ? (
                  <FolderOpen className="w-5 h-5 text-amber-500 fill-amber-950/50" />
                ) : (
                  <Folder className="w-5 h-5 text-amber-500 fill-amber-950/50" />
                )}
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border border-zinc-950" />
              </div>
            ) : isExpanded ? (
              <FolderOpen className="w-5 h-5 text-amber-400 fill-amber-950/40" />
            ) : (
              <Folder className="w-5 h-5 text-amber-400 fill-amber-950/20" />
            )}
          </div>

          {/* Folder Name & Path */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className={`font-medium truncate ${
                isRed 
                  ? 'text-red-300 font-semibold' 
                  : isOrange 
                  ? 'text-amber-200 font-semibold' 
                  : 'text-zinc-100'
              }`}>
                {node.name}
              </span>

              {/* Status Tag if Red */}
              {isRed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-red-950/90 text-red-300 border border-red-700/70 shadow-xs">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  &lt; {cutoffYear} ({node.year})
                </span>
              )}

              {/* Status Tag if Orange */}
              {isOrange && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-950/90 text-amber-300 border border-amber-600/70 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                  Contiene cartella &lt; {cutoffYear}
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-500 truncate font-mono">
              {node.path}
            </p>
          </div>
        </div>

        {/* Right: The Two Required Metrics (Dimensione & Ultima Modifica) */}
        <div className="flex items-center space-x-5 shrink-0 text-right">
          {/* Dimensione */}
          <div className="flex flex-col items-end min-w-[90px]">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-1">
              <HardDrive className="w-3 h-3" /> Dimensione
            </span>
            <span className={`font-semibold tabular-nums ${
              isRed 
                ? 'text-red-300 font-bold' 
                : isOrange 
                ? 'text-amber-200 font-semibold' 
                : 'text-zinc-200'
            }`}>
              {formatBytes(node.totalSize)}
            </span>
          </div>

          {/* Ultima Modifica */}
          <div className="flex flex-col items-end min-w-[130px]">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Ultima Modifica
            </span>
            <div className="flex items-center space-x-1">
              <span className={`tabular-nums ${
                isRed 
                  ? 'text-red-400 font-bold' 
                  : isOrange 
                  ? 'text-amber-300 font-semibold' 
                  : 'text-zinc-300'
              }`}>
                {formatDateTime(node.lastModified)}
              </span>
            </div>
          </div>

          {/* File count toggler */}
          {node.files && node.files.length > 0 && (
            <button
              onClick={() => setShowFiles(!showFiles)}
              className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
              title="Mostra file contenuti in questa cartella"
            >
              {node.files.length} file {showFiles ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {/* Direct files nested under folder if toggled */}
      {showFiles && node.files && node.files.length > 0 && (
        <div 
          className="my-1 border-l-2 border-zinc-800 space-y-1"
          style={{ marginLeft: `${level * 22 + 28}px` }}
        >
          {node.files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1 px-3 text-xs text-zinc-300 bg-zinc-950/60 hover:bg-zinc-800/60 rounded border border-zinc-800/50"
            >
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{file.name}</span>
              </div>
              <div className="flex items-center space-x-4 shrink-0 font-mono text-[11px] text-zinc-400">
                <span>{formatBytes(file.size)}</span>
                <span>{formatDateTime(file.lastModified)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recursive Children (subdirectories) */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.path}
              node={child}
              cutoffYear={cutoffYear}
              level={level + 1}
              expandedMap={expandedMap}
              onToggleExpand={onToggleExpand}
              filterOnlyRed={filterOnlyRed}
              searchFilter={searchFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
};
