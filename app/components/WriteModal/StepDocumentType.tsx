'use client';

import { DocumentType, DOCUMENT_TYPE_CONFIGS } from '@/lib/types/document';
import { getWordCountGuidance } from '@/lib/utils/documentStructure';

interface StepDocumentTypeProps {
  onSelect: (type: DocumentType) => void;
}

export default function StepDocumentType({ onSelect }: StepDocumentTypeProps) {
  const documentTypes = Object.values(DocumentType);

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Choose the type of document you want to create. Each type has a specific structure and citation style.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentTypes.map((type) => {
          const config = DOCUMENT_TYPE_CONFIGS[type];
          const wordCount = getWordCountGuidance(type);

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{config.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 mb-1">
                    {config.label}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{config.description}</p>

                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Citation Style:</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{config.citationStyle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Word Count:</span>
                      <span>{wordCount}</span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-400">
                    <span className="font-medium">Structure:</span> {config.structure.join(' • ')}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <span className="font-semibold">Tip:</span> All documents will be researched and cited automatically using
        credible sources from the web.
      </div>
    </div>
  );
}
