import React, { useState } from 'react';
import { 
  FolderTree, 
  Search, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { FolderTreeNode } from '../types';
import { FolderTreeItem } from './FolderTreeItem';
import { formatBytes } from '../services/folderScanner';

interface Props {
  tree: FolderTreeNode[];
  cutoffYear: number;
  totalSize: number;
  redCount: number;
  totalDirs: number;
  redSize: number;
}

export const FolderTreeView: React.FC<Props> = ({
  tree,
  cutoffYear,
  totalSize,
  redCount,
  totalDirs,
  redSize,
}) => {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => {
    // Default: expand root nodes
    const initial: Record<string, boolean> = {};
    for (const node of tree) {
      initial[node.path] = true;
    }
    return initial;
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [filterOnlyRed, setFilterOnlyRed] = useState(false);

  const handleToggleExpand = (path: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    function collect(nodes: FolderTreeNode[]) {
      for (const node of nodes) {
        next[node.path] = true;
        if (node.children.length > 0) {
          collect(node.children);
        }
      }
    }
    collect(tree);
    setExpandedMap(next);
  };

  const handleCollapseAll = () => {
    setExpandedMap({});
  };

  if (tree.length === 0) {
    return (
      <div className="bg-zinc-900/80 rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400 shadow-sm">
        <FolderTree className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
        <p className="text-base font-semibold text-zinc-200">Nessuna cartella scansionata</p>
        <p className="text-sm text-zinc-500 mt-1">
          Seleziona una cartella per avviare la scansione e visualizzare l'albero delle dimensioni e date di ultima modifica.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-md overflow-hidden">
      {/* Header bar with controls */}
      <div className="bg-zinc-950/80 border-b border-zinc-800 p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <FolderTree className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-zinc-100 text-sm sm:text-base">
            Struttura ad Albero Cartelle
          </h2>
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
            {totalDirs} {totalDirs === 1 ? 'cartella' : 'cartelle'}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Filtra per nome..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 w-36 sm:w-48"
            />
          </div>

          {/* Filter only red checkbox */}
          <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 select-none">
            <input
              type="checkbox"
              checked={filterOnlyRed}
              onChange={(e) => setFilterOnlyRed(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-red-500/30 cursor-pointer"
            />
            <span className="flex items-center gap-1.5 font-medium text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"></span>
              Solo &lt; {cutoffYear} ({redCount})
            </span>
          </label>

          {/* Expand / Collapse buttons */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            <button
              onClick={handleExpandAll}
              className="text-xs px-2.5 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-medium cursor-pointer transition-colors"
              title="Espandi tutte le cartelle"
            >
              Espandi tutto
            </button>
            <div className="w-[1px] h-4 bg-zinc-800"></div>
            <button
              onClick={handleCollapseAll}
              className="text-xs px-2.5 py-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-medium cursor-pointer transition-colors"
              title="Comprimi tutte le cartelle"
            >
              Comprimi tutto
            </button>
          </div>
        </div>
      </div>

      {/* Column legend */}
      <div className="bg-zinc-950/50 border-b border-zinc-800/80 px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <span>Percorso Cartella</span>
        </div>
        <div className="flex items-center space-x-6 text-right">
          <span className="min-w-[90px]">Dimensione Totale</span>
          <span className="min-w-[130px]">Ultima Modifica</span>
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-2 sm:p-3 max-h-[620px] overflow-y-auto space-y-0.5">
        {tree.map((node) => (
          <FolderTreeItem
            key={node.path}
            node={node}
            cutoffYear={cutoffYear}
            expandedMap={expandedMap}
            onToggleExpand={handleToggleExpand}
            filterOnlyRed={filterOnlyRed}
            searchFilter={searchFilter}
          />
        ))}
      </div>

      {/* Footer stats */}
      <div className="bg-zinc-950/90 border-t border-zinc-800 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
            Dimensione complessiva: <strong className="font-semibold text-zinc-100">{formatBytes(totalSize)}</strong>
          </span>
          {redCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-400 bg-red-950/60 border border-red-800/80 px-2.5 py-0.5 rounded-md font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              {redCount} cartelle &lt; {cutoffYear}: <strong className="font-semibold text-red-300">{formatBytes(redSize)}</strong>
            </span>
          )}
        </div>
        <div className="text-[11px] text-zinc-500 flex items-center gap-2">
          <span>Legenda:</span>
          <span className="text-red-400 font-medium">● Rosso (&lt; {cutoffYear})</span>
          <span>•</span>
          <span className="text-amber-400 font-medium">● Arancione (contiene cartelle &lt; {cutoffYear})</span>
        </div>
      </div>
    </div>
  );
};
