// Custom card component with personal styling
// TODO: maybe make this more reusable
import React from 'react';
import { cn } from '@/lib/utils';

interface CustomCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlighted' | 'experimental';
  // Non-standard prop for personal touch
  debugMode?: boolean;
}

export function CustomCard({ 
  children, 
  className, 
  variant = 'default',
  debugMode = false,
  ...props 
}: CustomCardProps) {
  // TODO: add more variants later
  const variants = {
    default: 'bg-card border border-border shadow-sm',
    highlighted: 'bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 shadow-primary/10',
    experimental: 'bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-200/20 shadow-purple-500/10'
  };

  return (
    <div 
      className={cn(
        'rounded-lg p-6 transition-all duration-300 hover:shadow-lg',
        variants[variant],
        debugMode && 'ring-2 ring-blue-500/50', // DEBUG: visual indicator
        className
      )}
      {...props}
    >
      {debugMode && (
        <div className="text-xs text-blue-500 mb-2">DEBUG MODE</div>
      )}
      {children}
    </div>
  );
}

// TODO: maybe add a CustomButton component too?
