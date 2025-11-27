'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';

interface EditorContextType {
  editor: Editor | null;
  registerEditor: (editor: Editor | null) => void;
  setContent: (content: string) => void;
  appendContent: (content: string) => void;
  getContent: () => string;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null);

  const registerEditor = useCallback((editorInstance: Editor | null) => {
    setEditor(editorInstance);
  }, []);

  const setContent = useCallback((content: string) => {
    if (editor) {
      editor.commands.setContent(content);
      editor.commands.focus('end');
    }
  }, [editor]);

  const appendContent = useCallback((content: string) => {
    if (editor) {
      // Get current content
      const currentContent = editor.getHTML();

      // Append new content
      const newContent = currentContent + content;

      editor.commands.setContent(newContent);
      editor.commands.focus('end');
    }
  }, [editor]);

  const getContent = useCallback(() => {
    if (editor) {
      return editor.getHTML();
    }
    return '';
  }, [editor]);

  return (
    <EditorContext.Provider value={{ editor, registerEditor, setContent, appendContent, getContent }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
}
