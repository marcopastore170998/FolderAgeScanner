import { DirectoryInfo, FolderTreeNode, ScannedFile } from '../types';

/**
 * Scan a directory using HTML File Input (FileList with webkitRelativePath)
 */
export function processFilesList(files: FileList | File[]): {
  directories: DirectoryInfo[];
  scannedFiles: ScannedFile[];
  tree: FolderTreeNode[];
} {
  const scannedFiles: ScannedFile[] = [];
  const dirMap = new Map<
    string,
    {
      name: string;
      parentPath: string | null;
      fileSizes: number[];
      modTimes: number[];
      files: ScannedFile[];
      subDirs: Set<string>;
      depth: number;
    }
  >();

  // Ensure root directory exists
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = (file as any).webkitRelativePath || file.name;
    const parts = relativePath.split('/');
    
    // Scanned file
    const fileInfo: ScannedFile = {
      path: relativePath,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified || Date.now(),
    };
    scannedFiles.push(fileInfo);

    // Build directory paths for each level
    let currentPath = '';
    for (let p = 0; p < parts.length - 1; p++) {
      const folderName = parts[p];
      const prevPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      if (!dirMap.has(currentPath)) {
        dirMap.set(currentPath, {
          name: folderName,
          parentPath: prevPath || null,
          fileSizes: [],
          modTimes: [],
          files: [],
          subDirs: new Set(),
          depth: p,
        });
      }

      if (prevPath && dirMap.has(prevPath)) {
        dirMap.get(prevPath)!.subDirs.add(currentPath);
      }

      // Add file size and timestamp to this directory and all ancestor directories
      const dirEntry = dirMap.get(currentPath)!;
      dirEntry.fileSizes.push(file.size);
      dirEntry.modTimes.push(file.lastModified || Date.now());
      
      // Associate direct file to immediate parent directory
      if (p === parts.length - 2) {
        dirEntry.files.push(fileInfo);
      }
    }
  }

  // Convert map to DirectoryInfo[]
  const directories: DirectoryInfo[] = [];
  for (const [dirPath, data] of dirMap.entries()) {
    const totalSize = data.fileSizes.reduce((acc, curr) => acc + curr, 0);
    const lastModified = data.modTimes.length > 0 ? Math.max(...data.modTimes) : 0;

    directories.push({
      path: dirPath,
      name: data.name,
      parentPath: data.parentPath,
      totalSize,
      lastModified,
      fileCount: data.files.length,
      subDirCount: data.subDirs.size,
      depth: data.depth,
    });
  }

  const tree = buildTreeFromDirectories(directories, dirMap);
  return { directories, scannedFiles, tree };
}

/**
 * Scan directory using File System Access API (showDirectoryPicker)
 */
export async function scanDirectoryHandle(
  dirHandle: any,
  onProgress?: (count: number, current: string) => void
): Promise<{
  directories: DirectoryInfo[];
  scannedFiles: ScannedFile[];
  tree: FolderTreeNode[];
}> {
  const scannedFiles: ScannedFile[] = [];
  let fileCount = 0;

  async function traverse(
    handle: any,
    currentPath: string
  ): Promise<void> {
    for await (const entry of handle.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        scannedFiles.push({
          path: entryPath,
          name: entry.name,
          size: file.size,
          lastModified: file.lastModified,
        });
        fileCount++;
        if (fileCount % 25 === 0 && onProgress) {
          onProgress(fileCount, entryPath);
        }
      } else if (entry.kind === 'directory') {
        await traverse(entry, entryPath);
      }
    }
  }

  // Start traverse from root
  await traverse(dirHandle, dirHandle.name);

  // Now process into directory aggregations
  const pseudoFiles = scannedFiles.map((f) => ({
    name: f.name,
    size: f.size,
    lastModified: f.lastModified,
    webkitRelativePath: f.path,
  })) as any as File[];

  return processFilesList(pseudoFiles);
}

/**
 * Builds tree nodes for rendering
 */
function buildTreeFromDirectories(
  directories: DirectoryInfo[],
  dirMap: Map<string, any>
): FolderTreeNode[] {
  const nodeMap = new Map<string, FolderTreeNode>();

  // Create node map
  for (const dir of directories) {
    const date = new Date(dir.lastModified);
    const year = isNaN(date.getFullYear()) ? 0 : date.getFullYear();

    nodeMap.set(dir.path, {
      path: dir.path,
      name: dir.name,
      parentPath: dir.parentPath,
      totalSize: dir.totalSize,
      lastModified: dir.lastModified,
      fileCount: dir.fileCount,
      subDirCount: dir.subDirCount,
      isRed: false,
      isOrange: false,
      year,
      children: [],
      files: dirMap.get(dir.path)?.files || [],
    });
  }

  const roots: FolderTreeNode[] = [];

  for (const dir of directories) {
    const node = nodeMap.get(dir.path)!;
    if (dir.parentPath && nodeMap.has(dir.parentPath)) {
      nodeMap.get(dir.parentPath)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by name
  function sortNodes(nodes: FolderTreeNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) {
      if (n.children.length > 0) {
        sortNodes(n.children);
      }
    }
  }

  sortNodes(roots);
  return roots;
}

/**
 * Updates isRed and isOrange properties recursively based on cutoffYear
 */
export function applyCutoffYearToTree(
  nodes: FolderTreeNode[],
  cutoffYear: number
): FolderTreeNode[] {
  return nodes.map((node) => {
    const updatedChildren = applyCutoffYearToTree(node.children, cutoffYear);
    const isRed = node.year > 0 && node.year < cutoffYear;
    const hasChildUnderCutoff = updatedChildren.some(
      (child) => child.isRed || child.isOrange
    );
    const isOrange = !isRed && hasChildUnderCutoff;

    return {
      ...node,
      isRed,
      isOrange,
      children: updatedChildren,
    };
  });
}

/**
 * Formats byte sizes into human readable strings
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i]}`;
}

/**
 * Formats epoch timestamp into date string
 */
export function formatDateTime(ms: number): string {
  if (!ms || ms <= 0) return 'N/D';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return 'N/D';
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}


