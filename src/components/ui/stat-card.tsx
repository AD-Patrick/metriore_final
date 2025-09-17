import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

const statCardVariants = cva(
  "relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-105",
  {
    variants: {
      variant: {
        primary: "primary-card interactive-card",
        secondary: "secondary-card interactive-card",
        accent: "accent-card interactive-card",
        success: "bg-gradient-to-br from-success/10 to-success/5 border-success/20 hover:shadow-glow",
        warning: "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20 hover:shadow-glow-secondary",
        glass: "bg-background/20 backdrop-blur-md border-border/30 hover:bg-background/30",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, variant, size, title, value, description, icon: Icon, trend, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(statCardVariants({ variant, size, className }))}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-2xl font-bold text-foreground">{value}</h3>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  trend.isPositive
                    ? "text-success bg-success/10"
                    : "text-destructive bg-destructive/10"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {Icon && (
          <div className="shrink-0 ml-4">
            <div className={cn(
              "p-2 rounded-lg",
              variant === "primary" && "bg-primary/10 text-primary",
              variant === "secondary" && "bg-secondary/10 text-secondary",
              variant === "accent" && "bg-xanthous/10 text-xanthous",
              variant === "success" && "bg-success/10 text-success",
              variant === "warning" && "bg-warning/10 text-warning",
              variant === "glass" && "bg-foreground/10 text-foreground"
            )}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>
      
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
    </div>
  )
);
StatCard.displayName = "StatCard";

export { StatCard };