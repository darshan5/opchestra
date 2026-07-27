'use client';

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from 'lucide-react';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  content: unknown;
  onChange?: (content: unknown) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Write a description...',
  readOnly = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    content: content as Record<string, unknown> | null,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getJSON());
    },
  });

  useEffect(() => {
    if (editor && readOnly !== !editor.isEditable) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  if (!editor) {
    return null;
  }

  function setLink() {
    if (!editor) {
      return;
    }
    const url = window.prompt('URL', editor.getAttributes('link').href || '');
    if (url === null) {
      return;
    }
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700',
        readOnly && 'border-transparent',
      )}
    >
      {!readOnly && (
        <div className="flex flex-wrap gap-0.5 border-b border-gray-200 p-1 dark:border-gray-700">
          {[
            {
              action: () => editor.chain().focus().toggleBold().run(),
              active: editor.isActive('bold'),
              icon: Bold,
              title: 'Bold',
            },
            {
              action: () => editor.chain().focus().toggleItalic().run(),
              active: editor.isActive('italic'),
              icon: Italic,
              title: 'Italic',
            },
            {
              action: () => editor.chain().focus().toggleStrike().run(),
              active: editor.isActive('strike'),
              icon: Strikethrough,
              title: 'Strikethrough',
            },
            {
              action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              active: editor.isActive('heading', { level: 2 }),
              icon: Heading2,
              title: 'Heading',
            },
            {
              action: () => editor.chain().focus().toggleBulletList().run(),
              active: editor.isActive('bulletList'),
              icon: List,
              title: 'Bullet List',
            },
            {
              action: () => editor.chain().focus().toggleOrderedList().run(),
              active: editor.isActive('orderedList'),
              icon: ListOrdered,
              title: 'Ordered List',
            },
            {
              action: () => editor.chain().focus().toggleBlockquote().run(),
              active: editor.isActive('blockquote'),
              icon: Quote,
              title: 'Quote',
            },
            {
              action: () => editor.chain().focus().toggleCodeBlock().run(),
              active: editor.isActive('codeBlock'),
              icon: Code,
              title: 'Code Block',
            },
            {
              action: setLink,
              active: editor.isActive('link'),
              icon: LinkIcon,
              title: 'Link',
            },
          ].map((btn) => (
            <button
              className={cn(
                'rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                btn.active && 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white',
              )}
              key={btn.title}
              onClick={btn.action}
              title={btn.title}
              type="button"
            >
              <btn.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
      <EditorContent
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none px-3 py-2',
          '[&_.tiptap]:min-h-[60px] [&_.tiptap]:outline-none',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-400 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          readOnly && 'px-0 py-0',
        )}
        editor={editor}
      />
    </div>
  );
}
