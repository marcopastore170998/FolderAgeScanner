import React, { useState, useRef, useMemo } from 'react';
import { 
  FolderPlus, 
  AlertTriangle, 
  HardDrive, 
  Calendar, 
  RefreshCw, 
  Info
} from 'lucide-react';
import { DirectoryInfo, FolderTreeNode, ScanProgress, ScannedFile } from './types';
import { 
  processFilesList, 
  scanDirectoryHandle, 
  applyCutoffYearToTree, 
  formatBytes 
} from './services/folderScanner';
import { FolderTreeView } from './components/FolderTreeView';

export default function App() {
  const [cutoffYear, setCutoffYear] = useState<number>(2023);
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([]);
  const [rawDirectories, setRawDirectories] = useState<DirectoryInfo[]>([]);
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [progress, setProgress] = useState<ScanProgress>({
    status: 'idle',
    totalFiles: 0,
    totalDirs: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler for directory selection via File System Access API or input fallback
  const handleSelectFolder = async () => {
    // Check if modern showDirectoryPicker is supported
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (!dirHandle) return;

        setProgress({
          status: 'scanning',
          totalFiles: 0,
          totalDirs: 0,
          currentFolder: dirHandle.name,
        });

        const result = await scanDirectoryHandle(dirHandle, (count, current) => {
          setProgress((prev) => ({
            ...prev,
            totalFiles: count,
            currentFolder: current,
          }));
        });

        finalizeScan(result.directories, result.scannedFiles, result.tree);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker non riuscito o bloccato, uso input file:', err);
      }
    }

    // Fallback: trigger HTML directory input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handler for HTML directory input change
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProgress({
      status: 'scanning',
      totalFiles: files.length,
      totalDirs: 0,
    });

    try {
      const result = processFilesList(files);
      finalizeScan(result.directories, result.scannedFiles, result.tree);
    } catch (err: any) {
      console.error('Errore elaborazione file:', err);
      setProgress({
        status: 'error',
        totalFiles: 0,
        totalDirs: 0,
        error: err?.message || 'Errore durante la scansione della cartella',
      });
    }
  };

  const finalizeScan = (
    directories: DirectoryInfo[],
    files: ScannedFile[],
    tree: FolderTreeNode[]
  ) => {
    setRawDirectories(directories);
    setScannedFiles(files);
    setTreeData(tree);

    setProgress({
      status: 'completed',
      totalFiles: files.length,
      totalDirs: directories.length,
    });
  };

  // Mark tree nodes as red if last modified year < cutoffYear
  const markedTree = useMemo(() => {
    return applyCutoffYearToTree(treeData, cutoffYear);
  }, [treeData, cutoffYear]);

  // Statistics for outdated (red) folders
  const redStats = useMemo(() => {
    let count = 0;
    let totalSize = 0;
    const paths = new Set<string>();
    for (const dir of rawDirectories) {
      const y = new Date(dir.lastModified).getFullYear();
      if (y > 0 && y < cutoffYear) {
        count++;
        totalSize += dir.totalSize;
        paths.add(dir.path);
      }
    }
    return { count, totalSize, paths };
  }, [cutoffYear, rawDirectories]);

  // Total disk size
  const totalDiskSize = useMemo(() => {
    return scannedFiles.reduce((acc, f) => acc + f.size, 0);
  }, [scannedFiles]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased">
      {/* Top Application Bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
                Scansione & Analisi Cartelle
              </h1>
              <p className="text-xs text-zinc-400">
                Vista ad albero con dimensione e data di ultima modifica, con evidenziazione in rosso per anno.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Controls Card */}
        <section className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-md p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Col: Folder Selection */}
            <div className="lg:col-span-6 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Seleziona cartella
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  disabled={progress.status === 'scanning'}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm shadow-md transition-all focus:outline-hidden disabled:opacity-50 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Seleziona cartella</span>
                </button>

                {/* Hidden input fallback for folder browsing */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  // @ts-expect-error webkitdirectory is standard across modern browsers
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                />
              </div>

              <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                La scansione elabora i file localmente nel browser.
              </p>
            </div>

            {/* Right Col: Cutoff Year Input */}
            <div className="lg:col-span-6 bg-zinc-950/70 rounded-xl p-4 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="cutoffYearInput" 
                  className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-red-400" />
                  Anno di riferimento
                </label>
                <span className="text-xs text-red-400 font-medium">
                  Evidenzia in rosso se &lt; {cutoffYear}
                </span>
              </div>

              <div>
                <input
                  id="cutoffYearInput"
                  type="number"
                  min={1970}
                  max={2099}
                  step={1}
                  value={cutoffYear}
                  onChange={(e) => setCutoffYear(parseInt(e.target.value) || 2020)}
                  className="w-full text-base font-bold text-zinc-100 bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2 shadow-xs focus:ring-2 focus:ring-red-500/40 focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <p className="text-[11px] text-zinc-400">
                Cartelle con ultima modifica &lt; {cutoffYear} marcate di <strong>rosso</strong>; cartelle che contengono all'interno cartelle sotto tale anno marcate di <strong>arancione</strong>.
              </p>
            </div>
          </div>

          {/* Scanning Progress Banner */}
          {progress.status === 'scanning' && (
            <div className="mt-5 p-3.5 bg-indigo-950/60 border border-indigo-800 rounded-xl flex items-center space-x-3 text-indigo-200 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
              <div className="flex-1 truncate">
                <span className="font-semibold">Scansione in corso...</span>
                <span className="ml-2 text-indigo-300">
                  {progress.totalFiles} file analizzati {progress.currentFolder && `(${progress.currentFolder})`}
                </span>
              </div>
            </div>
          )}

          {progress.status === 'error' && (
            <div className="mt-5 p-3.5 bg-red-950/80 border border-red-800 rounded-xl flex items-center space-x-2 text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{progress.error}</span>
            </div>
          )}
        </section>

        {/* Summary Stats Cards */}
        {rawDirectories.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Folders */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 shadow-sm flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 text-indigo-400 flex items-center justify-center shrink-0">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-400 uppercase font-semibold">Cartelle Totali</span>
                <p className="text-xl font-bold text-zinc-100 tabular-nums">
                  {rawDirectories.length}
                </p>
              </div>
            </div>

            {/* Total Size */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 shadow-sm flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 text-blue-400 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-400 uppercase font-semibold">Spazio Totale</span>
                <p className="text-xl font-bold text-zinc-100 tabular-nums">
                  {formatBytes(totalDiskSize)}
                </p>
              </div>
            </div>

            {/* Red / Outdated Folders Count */}
            <div className="bg-zinc-900 rounded-xl border border-red-900/60 p-4 shadow-sm flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-red-950/70 text-red-400 border border-red-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-red-400 uppercase font-semibold">
                  Marcate di Rosso (&lt; {cutoffYear})
                </span>
                <p className="text-xl font-bold text-red-300 tabular-nums">
                  {redStats.count} <span className="text-xs font-normal text-red-400">({rawDirectories.length > 0 ? Math.round((redStats.count / rawDirectories.length) * 100) : 0}%)</span>
                </p>
              </div>
            </div>

            {/* Red Folders Size */}
            <div className="bg-zinc-900 rounded-xl border border-red-900/60 p-4 shadow-sm flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-red-950/70 text-red-400 border border-red-800 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-red-400 uppercase font-semibold">
                  Spazio Cartelle Obsolete
                </span>
                <p className="text-xl font-bold text-red-300 tabular-nums">
                  {formatBytes(redStats.totalSize)}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Tree View Section */}
        <section>
          <FolderTreeView
            tree={markedTree}
            cutoffYear={cutoffYear}
            totalSize={totalDiskSize}
            redCount={redStats.count}
            totalDirs={rawDirectories.length}
            redSize={redStats.totalSize}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900 py-4 text-center text-xs text-zinc-500">
        Analisi Cartelle • Vista ad albero con dimensione e data di ultima modifica
      </footer>
    </div>
  );
}
