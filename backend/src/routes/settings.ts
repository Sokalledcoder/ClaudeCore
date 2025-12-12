import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const router = Router();

// In-memory settings (in production, store in DB or file)
let settings = {
  connectionMode: 'claude_code' as 'api' | 'claude_code',
  apiKey: undefined as string | undefined,
};

// Load settings from file if exists
const settingsPath = path.join(process.cwd(), '.settings.json');
try {
  if (fs.existsSync(settingsPath)) {
    const data = fs.readFileSync(settingsPath, 'utf-8');
    const loaded = JSON.parse(data);
    settings = { ...settings, ...loaded };
    // If API key was saved, also set it as env var on startup
    if (loaded.apiKey) {
      process.env.ANTHROPIC_API_KEY = loaded.apiKey;
      console.log('✓ Loaded API key from settings file');
    }
  }
} catch (e) {
  console.warn('Could not load settings file:', e);
}

// Check if Claude Code CLI is installed and authenticated
router.get('/check-claude-code', async (_req, res) => {
  try {
    // Check if claude command exists
    try {
      await execAsync('which claude || where claude');
    } catch {
      return res.json({ installed: false, authenticated: false });
    }

    // Check if authenticated by running a simple command
    try {
      const { stdout } = await execAsync('claude --version', { timeout: 5000 });
      // If we get version info, CLI is installed
      // Check for authentication by looking for config
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const claudeConfigPath = path.join(homeDir, '.claude', 'config.json');
      const claudeSettingsPath = path.join(homeDir, '.claude.json');
      
      const hasConfig = fs.existsSync(claudeConfigPath) || fs.existsSync(claudeSettingsPath);
      
      // Also try to check auth status
      if (hasConfig) {
        return res.json({ installed: true, authenticated: true, version: stdout.trim() });
      } else {
        return res.json({ installed: true, authenticated: false, version: stdout.trim() });
      }
    } catch (e) {
      return res.json({ installed: true, authenticated: false });
    }
  } catch (error) {
    console.error('Error checking Claude Code CLI:', error);
    return res.json({ installed: false, authenticated: false });
  }
});

// Get current settings
router.get('/', (_req, res) => {
  res.json({
    connectionMode: settings.connectionMode,
    hasApiKey: !!settings.apiKey,
  });
});

// Update settings
router.put('/', (req, res) => {
  const { connectionMode, apiKey } = req.body;

  if (connectionMode) {
    settings.connectionMode = connectionMode;
  }
  if (apiKey !== undefined) {
    settings.apiKey = apiKey || undefined;
  }

  // Save to file (including API key - stored locally, user's machine)
  try {
    const saveData: Record<string, unknown> = {
      connectionMode: settings.connectionMode,
    };
    // Save API key to settings file for persistence across restarts
    if (settings.apiKey) {
      saveData.apiKey = settings.apiKey;
    }
    fs.writeFileSync(settingsPath, JSON.stringify(saveData, null, 2));
  } catch (e) {
    console.warn('Could not save settings file:', e);
  }

  // Also set as env var for immediate use
  if (apiKey) {
    process.env.ANTHROPIC_API_KEY = apiKey;
  }

  res.json({ success: true });
});

// Get the connection mode for use by other services
export function getConnectionSettings() {
  return {
    connectionMode: settings.connectionMode,
    apiKey: settings.apiKey || process.env.ANTHROPIC_API_KEY,
  };
}

export default router;
