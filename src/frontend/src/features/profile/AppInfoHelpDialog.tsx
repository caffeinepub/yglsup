import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Copy, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { BUILD_ID } from '../../constants/buildInfo';

interface AppInfoHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AppInfoHelpDialog({ open, onOpenChange }: AppInfoHelpDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopyError('Failed to copy. Please select and copy manually.');
      console.error('Copy failed:', err);
    }
  };

  const handleReloadWithCacheBuster = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.href = url.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>App Info & Help</DialogTitle>
          <DialogDescription>
            View your current app URL and troubleshoot update issues.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current URL Section */}
          <div className="space-y-2">
            <Label htmlFor="current-url">Current App URL</Label>
            <div className="flex gap-2">
              <Input
                id="current-url"
                value={currentUrl}
                readOnly
                className="flex-1 font-mono text-xs"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                title="Copy URL"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copyError && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{copyError}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Not Updated Section */}
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-1">Not seeing updates?</h4>
              <p className="text-sm text-muted-foreground">
                Your browser may be showing a cached version. Try these steps:
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <p className="font-medium">Hard Refresh Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><strong>Windows/Linux:</strong> Press Ctrl + Shift + R or Ctrl + F5</li>
                <li><strong>Mac:</strong> Press Cmd + Shift + R or Cmd + Option + R</li>
                <li><strong>Mobile:</strong> Close the tab completely and reopen</li>
              </ul>
            </div>

            <Button
              onClick={handleReloadWithCacheBuster}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload with Cache-Buster
            </Button>
          </div>

          <Separator />

          {/* Build Info Section */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Build Identifier</Label>
            <p className="font-mono text-xs bg-muted/50 rounded px-2 py-1.5">
              {BUILD_ID}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
