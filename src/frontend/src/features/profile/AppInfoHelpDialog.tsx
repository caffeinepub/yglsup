import { useState } from 'react';
import { Copy, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BUILD_ID } from '../../constants/buildInfo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AppInfoHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initDiagnostics?: {
    lastInitError?: string;
  };
}

export function AppInfoHelpDialog({ open, onOpenChange, initDiagnostics }: AppInfoHelpDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const appUrl = window.location.origin;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleHardRefresh = () => {
    // Add cache-busting parameter
    const url = new URL(window.location.href);
    url.searchParams.set('_refresh', Date.now().toString());
    window.location.href = url.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>App Info & Help</DialogTitle>
          <DialogDescription>
            Information about this application and troubleshooting options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* App URL */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">App URL</h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs break-all">
                {appUrl}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Build Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Build Information</h4>
            <p className="text-xs text-muted-foreground">
              Build ID: <code className="rounded bg-muted px-1 py-0.5">{BUILD_ID}</code>
            </p>
          </div>

          {/* Initialization Diagnostics (if provided) */}
          {initDiagnostics?.lastInitError && (
            <>
              <Separator />
              <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
                <div className="space-y-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="text-sm font-medium">Initialization Diagnostics</span>
                      {showDiagnostics ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md bg-muted p-3 text-xs font-mono break-all">
                      {initDiagnostics.lastInitError}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </>
          )}

          <Separator />

          {/* Troubleshooting */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Troubleshooting</h4>
            
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                If you're experiencing issues or not seeing the latest updates:
              </p>

              <Button
                onClick={handleHardRefresh}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Hard Refresh (Clear Cache)
              </Button>

              <div className="rounded-md bg-muted p-3 space-y-2 text-xs">
                <p className="font-medium">Manual refresh instructions:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Windows/Linux:</strong> Ctrl + Shift + R or Ctrl + F5</li>
                  <li><strong>Mac:</strong> Cmd + Shift + R</li>
                  <li><strong>Mobile:</strong> Clear browser cache in settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
