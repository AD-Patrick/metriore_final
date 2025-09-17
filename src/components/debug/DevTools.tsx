// TEMP: debug component
// TODO: remove before prod
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DevTools() {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <Card className="w-64">
          <CardHeader>
            <CardTitle className="text-sm">Dev Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                console.log('User data:', localStorage.getItem('user'), '👤');
                console.log('Session:', localStorage.getItem('session'));
              }}
            >
              Log Auth Data
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                // TODO: more debug functions
                console.log('Debugging app state 🔍');
              }}
            >
              Debug App State
            </Button>
          </CardContent>
        </Card>
      )}
      <Button 
        size="sm" 
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full"
      >
        🐛
      </Button>
    </div>
  );
}

// FIXME: error handling needed
