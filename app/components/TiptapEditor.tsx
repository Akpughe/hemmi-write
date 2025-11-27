'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useEffect } from 'react';
import { useEditorContext } from '@/lib/contexts/EditorContext';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded hover:bg-gray-100 transition-colors ${
      isActive ? 'bg-gray-100 text-blue-600' : 'text-gray-700'
    }`;

  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-white sticky top-0 z-10 flex-wrap">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive('bold'))}
        title="Bold"
      >
        <Bold className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive('italic'))}
        title="Italic"
      >
        <Italic className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={buttonClass(editor.isActive('strike'))}
        title="Strikethrough"
      >
        <Strikethrough className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={buttonClass(editor.isActive('code'))}
        title="Code"
      >
        <Code className="w-5 h-5" />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 1 }))}
        title="Heading 1"
      >
        <Heading1 className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2"
      >
        <Heading2 className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 3 }))}
        title="Heading 3"
      >
        <Heading3 className="w-5 h-5" />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        <List className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive('orderedList'))}
        title="Numbered List"
      >
        <ListOrdered className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={buttonClass(editor.isActive('blockquote'))}
        title="Quote"
      >
        <Quote className="w-5 h-5" />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Undo"
      >
        <Undo className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Redo"
      >
        <Redo className="w-5 h-5" />
      </button>
    </div>
  );
};

export default function TiptapEditor() {
  const { registerEditor } = useEditorContext();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: true, // Allow HTML in markdown
        tightLists: true, // No <p> tags in list items
        breaks: true, // Convert \n to <br>
        linkify: true, // Auto-convert URLs to links
      }),
    ],
    content: `
      <h1>Welcome to your writing space</h1>
      <p>Start typing to create your masterpiece...</p>
      <p></p>
      <h2>Features</h2>
      <ul>
        <li>Rich text editing</li>
        <li>Multiple heading levels</li>
        <li>Lists and quotes</li>
        <li>And much more!</li>
      </ul>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-screen px-12 py-8 font-[family-name:var(--font-lora)] text-black',
      },
    },
    immediatelyRender: false,
  });

  // Register editor with context when it's created
  useEffect(() => {
    if (editor) {
      registerEditor(editor);
    }
    return () => {
      registerEditor(null);
    };
  }, [editor, registerEditor]);

  return (
    <div className="flex flex-col h-screen bg-white">
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
