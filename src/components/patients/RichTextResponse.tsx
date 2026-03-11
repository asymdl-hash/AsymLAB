'use client';

import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextSelection } from '@tiptap/pm/state';
import { Bold, List, ListOrdered } from 'lucide-react';

interface RichTextResponseProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export default function RichTextResponse({ value, onChange, placeholder = 'Resposta...' }: RichTextResponseProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: false,
                codeBlock: false,
                blockquote: false,
                horizontalRule: false,
                code: false,
                strike: false,
                italic: false,
            }),
        ],
        content: value || '',
        editorProps: {
            attributes: {
                class: 'rich-text-response-editor focus:outline-none',
            },
        },
        onUpdate: ({ editor: ed }) => {
            const html = ed.getHTML();
            onChange(html === '<p></p>' ? '' : html);
        },
    });

    // Sync value from outside (e.g., draft restore)
    useEffect(() => {
        if (editor && value !== editor.getHTML() && value !== (editor.getHTML() === '<p></p>' ? '' : editor.getHTML())) {
            editor.commands.setContent(value || '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Lógica inteligente para toggle de listas:
    // 1. Se já estamos numa lista → toggle off (normal)
    // 2. Se NÃO há seleção e o bloco tem texto → split + nova linha com lista
    // 3. Se há seleção ou bloco vazio → toggle normal (comportamento Word/Google Docs)
    const smartToggleList = useCallback((listType: 'bulletList' | 'orderedList') => {
        if (!editor) return;

        const toggleCmd = listType === 'bulletList' ? 'toggleBulletList' : 'toggleOrderedList';

        // Se já está neste tipo de lista, simplesmente remove
        if (editor.isActive(listType)) {
            editor.chain().focus()[toggleCmd]().run();
            return;
        }

        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;
        const $from = editor.state.selection.$from;
        const currentNode = $from.parent;
        const blockHasContent = currentNode.textContent.trim().length > 0;

        // CASO 1: Sem seleção e o bloco tem texto → nova linha com lista abaixo
        if (blockHasContent && !hasSelection) {
            editor.chain().focus()
                .command(({ tr, dispatch }) => {
                    const endPos = $from.end();
                    if (dispatch) {
                        tr.setSelection(TextSelection.near(tr.doc.resolve(endPos)));
                    }
                    return true;
                })
                .splitBlock()
            [toggleCmd]()
                .run();
            return;
        }

        // CASO 2: Bloco vazio ou há seleção → toggle normal
        editor.chain().focus()[toggleCmd]().run();
    }, [editor]);

    if (!editor) return null;

    const isEmpty = !editor.getText().trim();

    return (
        <div className="rich-text-response-wrapper group/rich">
            {/* Mini toolbar — visível quando focado */}
            <div className="flex items-center gap-0.5 px-1 pt-1 pb-0 opacity-0 group-focus-within/rich:opacity-100 transition-opacity duration-200">
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    title="Negrito (Ctrl+B)"
                >
                    <Bold className="h-2.5 w-2.5" />
                </button>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); smartToggleList('orderedList'); }}
                    className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    title="Lista numerada"
                >
                    <ListOrdered className="h-2.5 w-2.5" />
                </button>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); smartToggleList('bulletList'); }}
                    className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    title="Marcadores"
                >
                    <List className="h-2.5 w-2.5" />
                </button>
            </div>

            {/* Editor */}
            <div className="relative">
                <EditorContent editor={editor} />
                {isEmpty && (
                    <p className="absolute top-0 left-0 right-0 px-2 py-1 text-[11px] text-gray-300 pointer-events-none">
                        {placeholder}
                    </p>
                )}
            </div>
        </div>
    );
}
