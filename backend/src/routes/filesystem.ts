import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const router = Router();

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

// List directories in a given path
router.get('/browse', (req, res) => {
  const targetPath = (req.query.path as string) || os.homedir();
  
  try {
    // Resolve to absolute path
    const absolutePath = path.resolve(targetPath);
    
    // Check if path exists and is a directory
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Path not found' });
    }
    
    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }
    
    // Read directory contents
    const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
    
    // Filter to only directories and format response
    const directories: DirectoryEntry[] = entries
      .filter(entry => {
        // Skip hidden files/folders (starting with .)
        if (entry.name.startsWith('.')) return false;
        // Only include directories
        if (!entry.isDirectory()) return false;
        // Check if readable
        try {
          fs.accessSync(path.join(absolutePath, entry.name), fs.constants.R_OK);
          return true;
        } catch {
          return false;
        }
      })
      .map(entry => ({
        name: entry.name,
        path: path.join(absolutePath, entry.name),
        isDirectory: true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Get parent directory
    const parentPath = path.dirname(absolutePath);
    const canGoUp = parentPath !== absolutePath;
    
    res.json({
      currentPath: absolutePath,
      parentPath: canGoUp ? parentPath : null,
      directories,
    });
  } catch (error) {
    console.error('Error browsing directory:', error);
    res.status(500).json({ error: 'Failed to browse directory' });
  }
});

// Create a new folder
router.post('/create-folder', (req, res) => {
  const { parentPath, folderName } = req.body;
  
  if (!parentPath || !folderName) {
    return res.status(400).json({ error: 'parentPath and folderName are required' });
  }
  
  // Validate folder name (no path separators or special chars)
  if (folderName.includes('/') || folderName.includes('\\') || folderName.startsWith('.')) {
    return res.status(400).json({ error: 'Invalid folder name' });
  }
  
  try {
    const absoluteParent = path.resolve(parentPath);
    const newFolderPath = path.join(absoluteParent, folderName);
    
    // Check parent exists
    if (!fs.existsSync(absoluteParent)) {
      return res.status(404).json({ error: 'Parent path not found' });
    }
    
    // Check folder doesn't already exist
    if (fs.existsSync(newFolderPath)) {
      return res.status(409).json({ error: 'Folder already exists' });
    }
    
    // Create the folder
    fs.mkdirSync(newFolderPath, { recursive: true });
    
    return res.json({ 
      success: true, 
      path: newFolderPath,
      name: folderName
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get common/recent directories
router.get('/quick-paths', (_req, res) => {
  const home = os.homedir();
  
  const quickPaths = [
    { name: 'Home', path: home },
    { name: 'Desktop', path: path.join(home, 'Desktop') },
    { name: 'Documents', path: path.join(home, 'Documents') },
    { name: 'Projects', path: path.join(home, 'Projects') },
    { name: 'Code', path: path.join(home, 'Code') },
    { name: 'dev', path: path.join(home, 'dev') },
    { name: 'Root', path: '/' },
  ].filter(p => {
    try {
      return fs.existsSync(p.path) && fs.statSync(p.path).isDirectory();
    } catch {
      return false;
    }
  });
  
  res.json({ quickPaths });
});

export default router;
