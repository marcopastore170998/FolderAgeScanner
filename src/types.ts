export interface ScannedFile {
  path: string;
  name: string;
  size: number;
  lastModified: number; // timestamp in ms
}

export interface DirectoryInfo {
  path: string;
  name: string;
  parentPath: string | null;
  totalSize: number;
  lastModified: number; // timestamp in ms
  fileCount: number;
  subDirCount: number;
  depth: number;
}

export interface FolderTreeNode {
  path: string;
  name: string;
  parentPath: string | null;
  totalSize: number;
  lastModified: number;
  fileCount: number;
  subDirCount: number;
  isRed: boolean; // True if lastModified year is older than cutoff year
  isOrange: boolean; // True if contains a subfolder older than cutoff year
  year: number;
  children: FolderTreeNode[];
  files?: ScannedFile[];
}

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'processing' | 'completed' | 'error';
  totalFiles: number;
  totalDirs: number;
  currentFolder?: string;
  error?: string;
}
