import { AlertCircle, RefreshCw, Trash2, ShieldAlert, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { sanitizeInitError } from './sanitizeInitError';
import { BUILD_ID } from '../../constants/buildInfo';
import { useState } from 'react';

interface InitErrorScreenProps {
  error: Error | null;
  onRetry: () => void;
  onReset: () => void;
  isRetrying?: boolean;
}

export function InitErrorScreen({ error, onRetry, onReset, isRetrying = false }: InitErrorScreenProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const { summary, technicalDetail, kind } = sanitizeInitError(error);

  // Determine icon and guidance based on error kind
  const isAuthError = kind === 'authorization';
  const isNetworkError = kind === 'network' || kind === 'timeout';
  
  const ErrorIcon = isAuthError ? ShieldAlert : isNetworkError ? Wifi : AlertCircle;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <ErrorIcon className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle>Initialization Failed</CardTitle>
              <CardDescription>Unable to start the application</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{summary}</AlertDescription>
          </Alert>

          {/* Contextual guidance based on error type */}
          {isAuthError && (
            <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle>Authorization Issue</AlertTitle>
              <AlertDescription className="text-sm">
                Access is not authorized. This may be due to an invalid or expired access token. 
                Try retrying the connection, or reset your local app data to start fresh.
              </AlertDescription>
            </Alert>
          )}

          {isNetworkError && (
            <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>Network Issue</AlertTitle>
              <AlertDescription className="text-sm">
                Unable to reach the server. Please check your internet connection and try again. 
                If the problem persists, the service may be temporarily unavailable.
              </AlertDescription>
            </Alert>
          )}

          {technicalDetail && (
            <Collapsible open={showTechnical} onOpenChange={setShowTechnical}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  {showTechnical ? 'Hide' : 'Show'} technical details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="rounded-md bg-muted p-3 text-xs font-mono break-all">
                  {technicalDetail}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recovery Options</h4>
            <p className="text-xs text-muted-foreground">
              {isAuthError 
                ? 'For authorization issues, resetting local data may help clear invalid credentials.'
                : 'Try retrying the connection, or reset your local data to start fresh.'}
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full"
            variant="default"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </>
            )}
          </Button>

          <Button
            onClick={onReset}
            disabled={isRetrying}
            className="w-full"
            variant="outline"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Reset Local App Data
          </Button>

          <Separator className="my-2" />

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Build: {BUILD_ID}</p>
            <p>If the problem persists, contact support.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
