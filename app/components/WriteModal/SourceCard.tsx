'use client';

import { ExternalLink, CheckCircle2, Circle } from 'lucide-react';
import { ResearchSource } from '@/lib/types/document';

interface SourceCardProps {
  source: ResearchSource;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
}

export default function SourceCard({ source, index, selected, onToggle }: SourceCardProps) {
  return (
    <div
      className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={() => onToggle(source.id)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {selected ? (
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 flex-1">
              [{index + 1}] {source.title}
            </h4>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
              title="Open source"
            >
              <ExternalLink className="w-4 h-4 text-gray-600" />
            </a>
          </div>

          {source.author && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Author:</span> {source.author}
            </p>
          )}

          {source.publishedDate && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Published:</span>{' '}
              {new Date(source.publishedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}

          <p className="text-sm text-gray-700 line-clamp-3 mb-2">
            {source.excerpt}
          </p>

          <p className="text-xs text-gray-500 truncate">
            <span className="font-medium">URL:</span> {source.url}
          </p>

          {source.score && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Relevance:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(source.score * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 font-medium">
                  {Math.round(source.score * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
