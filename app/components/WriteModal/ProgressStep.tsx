'use client';

import { CheckCircle2, Loader2, Circle } from 'lucide-react';

interface ProgressStepProps {
  status: 'pending' | 'active' | 'completed';
  title: string;
  description?: string;
}

export default function ProgressStep({ status, title, description }: ProgressStepProps) {
  return (
    <div className="flex items-start gap-3">
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {status === 'completed' && (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        )}
        {status === 'active' && (
          <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
        )}
        {status === 'pending' && (
          <Circle className="w-6 h-6 text-muted-foreground/50" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h4
          className={`font-medium ${
            status === 'active'
              ? 'text-blue-700 dark:text-blue-300'
              : status === 'completed'
              ? 'text-green-700 dark:text-green-400'
              : 'text-muted-foreground'
          }`}
        >
          {title}
        </h4>
        {description && (
          <p
            className={`text-sm mt-0.5 ${
              status === 'active'
                ? 'text-blue-600 dark:text-blue-400'
                : status === 'completed'
                ? 'text-green-600 dark:text-green-500'
                : 'text-muted-foreground/70'
            }`}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
