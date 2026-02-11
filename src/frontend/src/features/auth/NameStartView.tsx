import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME, APP_TAGLINE } from '../../constants/branding';
import { MessageCircle } from 'lucide-react';
import { saveDisplayName, setOnboardingComplete } from '../../lib/localProfile';

interface NameStartViewProps {
  onComplete: (name: string) => void;
}

export default function NameStartView({ onComplete }: NameStartViewProps) {
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim();
    
    if (!trimmedName) return;

    setIsSubmitting(true);
    
    // Save locally
    saveDisplayName(trimmedName);
    setOnboardingComplete();
    
    // Notify parent
    onComplete(trimmedName);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 p-4">
      <Card className="w-full max-w-md shadow-2xl border-emerald-100 dark:border-emerald-900/30">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center mb-2">
            <img 
              src="/assets/generated/yglsup-logo.dim_1200x300.png" 
              alt={APP_NAME}
              className="h-16 w-auto"
            />
          </div>
          <div className="flex justify-center">
            <div className="rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 p-4 shadow-lg">
              <MessageCircle className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Welcome to {APP_NAME}
          </CardTitle>
          <CardDescription className="text-base">
            {APP_TAGLINE}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Enter your name to get started</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isSubmitting}
                className="h-12"
                autoFocus
                maxLength={50}
              />
            </div>
            <Button
              type="submit"
              disabled={!displayName.trim() || isSubmitting}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Starting...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
