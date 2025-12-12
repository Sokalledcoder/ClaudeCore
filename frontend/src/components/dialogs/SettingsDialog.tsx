import { useState, useEffect } from 'react';
import { X, Settings, Key, Terminal, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [connectionMode, setConnectionMode] = useState<'api' | 'claude_code'>('claude_code');
  const [saved, setSaved] = useState(false);
  const [cliStatus, setCliStatus] = useState<'checking' | 'authenticated' | 'not_found' | 'not_authenticated'>('checking');

  useEffect(() => {
    if (open) {
      const storedKey = localStorage.getItem('anthropic_api_key') ?? '';
      const storedMode = localStorage.getItem('connection_mode') ?? 'claude_code';
      setApiKey(storedKey);
      setConnectionMode(storedMode as 'api' | 'claude_code');
      checkClaudeCodeCLI();
    }
  }, [open]);

  const checkClaudeCodeCLI = async () => {
    setCliStatus('checking');
    try {
      const result = await api.settings.checkClaudeCode();
      if (result.installed && result.authenticated) {
        setCliStatus('authenticated');
      } else if (result.installed) {
        setCliStatus('not_authenticated');
      } else {
        setCliStatus('not_found');
      }
    } catch {
      setCliStatus('not_found');
    }
  };

  const handleSave = async () => {
    localStorage.setItem('anthropic_api_key', apiKey);
    localStorage.setItem('connection_mode', connectionMode);
    
    // Also save to backend
    try {
      await api.settings.update({ 
        connectionMode, 
        apiKey: connectionMode === 'api' ? apiKey : undefined 
      });
    } catch (e) {
      console.error('Failed to save settings to backend:', e);
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-lg p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">Configure your connection to Claude</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">Connection Mode</label>
            <div className="space-y-2">
              <label 
                className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-secondary/50 ${
                  connectionMode === 'claude_code' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="connectionMode"
                  value="claude_code"
                  checked={connectionMode === 'claude_code'}
                  onChange={() => setConnectionMode('claude_code')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    <span className="font-medium">Claude Code CLI</span>
                    <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">Recommended</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uses Claude Code CLI authentication. Works with your Claude Pro/Max subscription.
                  </p>
                  
                  {connectionMode === 'claude_code' && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {cliStatus === 'checking' && (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-muted-foreground">Checking CLI status...</span>
                        </>
                      )}
                      {cliStatus === 'authenticated' && (
                        <>
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">Claude Code CLI authenticated</span>
                        </>
                      )}
                      {cliStatus === 'not_authenticated' && (
                        <>
                          <AlertCircle className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400">CLI found but not authenticated. Run: claude login</span>
                        </>
                      )}
                      {cliStatus === 'not_found' && (
                        <>
                          <AlertCircle className="w-3 h-3 text-red-400" />
                          <span className="text-red-400">Claude Code CLI not found. Install: npm i -g @anthropic-ai/claude-code</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-secondary/50 ${
                  connectionMode === 'api' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="connectionMode"
                  value="api"
                  checked={connectionMode === 'api'}
                  onChange={() => setConnectionMode('api')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    <span className="font-medium">API Key</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use Anthropic API directly with your own API key. Pay-per-token.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {connectionMode === 'api' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <span className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Anthropic API Key
                </span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
          )}

          {connectionMode === 'claude_code' && cliStatus === 'not_found' && (
            <div className="p-4 bg-secondary rounded-md">
              <p className="text-sm font-medium mb-2">Setup Instructions:</p>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Install Node.js 18+ if not already installed</li>
                <li>Run: <code className="bg-background px-1 rounded">npm install -g @anthropic-ai/claude-code</code></li>
                <li>Run: <code className="bg-background px-1 rounded">claude login</code></li>
                <li>Authenticate with your Claude account (Pro/Max subscription)</li>
                <li>Click "Refresh" below to check status</li>
              </ol>
              <button
                onClick={checkClaudeCodeCLI}
                className="mt-3 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Refresh Status
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-secondary"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={connectionMode === 'api' && !apiKey}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
