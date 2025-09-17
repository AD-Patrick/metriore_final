// TEMP: Page debugging component
// TODO: remove before production
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PageDebuggerProps {
  pageName: string;
  data?: any;
  // Non-standard prop for personal touch
  showMetrics?: boolean;
}

export function PageDebugger({ pageName, data, showMetrics = false }: PageDebuggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      {isOpen && (
        <Card className="w-80 max-h-96 overflow-y-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Page Debug: {pageName}
              <Badge variant="outline" className="text-xs">DEV</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs">
              <div className="font-medium mb-1">Data Summary:</div>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
            
            {showMetrics && (
              <div className="text-xs">
                <div className="font-medium mb-1">Metrics:</div>
                <div className="space-y-1">
                  <div>Render time: {performance.now().toFixed(2)}ms</div>
                  <div>Data size: {JSON.stringify(data).length} bytes</div>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log(`[${pageName}] Full data dump:`, data);
                  console.log(`[${pageName}] Performance:`, performance.now());
                }}
              >
                Log All
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  // TODO: add more debugging functions
                  console.log(`[${pageName}] Custom debug...`);
                }}
              >
                Custom
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Button 
        size="sm" 
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full text-xs"
      >
        🐛 {pageName}
      </Button>
    </div>
  );
}

// TODO: maybe add more debugging features?
