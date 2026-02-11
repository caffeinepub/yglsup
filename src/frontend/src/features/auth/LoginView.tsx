import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME, APP_TAGLINE } from '../../constants/branding';
import { MessageCircle } from 'lucide-react';

export default function LoginView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 p-4">
      <Card className="w-full max-w-md shadow-2xl border-emerald-100 dark:border-emerald-900/30">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center mb-2">
            <img 
              src="/assets/generated/yglsup-logo.dim_1024x256.png" 
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
        <CardContent className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            This view is no longer used. Please refresh the app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
