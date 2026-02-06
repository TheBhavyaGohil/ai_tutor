"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useEditor, EditorContent, JSONContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

import { supabase } from "@/lib/supabaseClient";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3, Download, Menu, ChevronLeft,
  Sparkles, Check, RefreshCw, Trash2, Plus, FileText,
  Calendar, Loader2, ListTodo, CheckSquare, Square, X,
  Wand2, Type, List, ListOrdered
} from "lucide-react";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";

// --- CUSTOM FONT SIZE EXTENSION ---
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
          renderHTML: attributes => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// --- TYPES ---
interface Note {
  id: string;
  title: string;
  content: JSONContent;
  updated_at: string;
}

export default function NotesLLM() {
  // --- STATE ---
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [notesList, setNotesList] = useState<Note[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const lastLoadedId = useRef<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [, setPendingApprovalContent] = useState<string>(''); // Kept for logic consistency
  const [lastGenerationPrompt, setLastGenerationPrompt] = useState<{ prompt: string; context: string }>({ prompt: '', context: '' });

  // --- EDITOR SETUP ---
  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
    }),
    Underline,
    TextStyle,
    FontSize,
    Color,
    TaskList,
    TaskItem.configure({ nested: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Placeholder.configure({
      placeholder: "Type '/' for commands or Ctrl+Enter for AI magic...",
      emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-slate-400 before:float-left before:pointer-events-none'
    }),
  ], []);

  const editor = useEditor({
    immediatelyRender: false, 
    extensions: extensions,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[700px] px-4 pb-32 text-slate-700",
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          handleAiGeneration();
          return true;
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getJSON(), editor.getText());
    },
  });

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        
        if (data) {
          setNotesList(data);
          if (data.length > 0 && !activeNoteId) {
            setActiveNoteId(data[0].id);
          }
        }
      }
    };
    init();
  }, [activeNoteId]);

  // --- LOAD CONTENT ---
  useEffect(() => {
    if (activeNoteId && editor && notesList.length > 0) {
      if (lastLoadedId.current === activeNoteId) return;

      const note = notesList.find(n => n.id === activeNoteId);
      if (note) {
        editor.commands.setContent(note.content || {});
        lastLoadedId.current = activeNoteId;
      }
    }
  }, [activeNoteId, editor, notesList]);

  // --- SAVE LOGIC ---
  const saveNote = async (content: JSONContent, text: string) => {
    if (!activeNoteId || !user) return;
    
    const firstLine = text.split('\n')[0].substring(0, 40) || "Untitled Note";
    const title = firstLine.trim();

    setIsSaving(true);
    await supabase
      .from('notes')
      .update({ 
        content: content, 
        title: title, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', activeNoteId);
    
    setNotesList(prev => prev.map(n => 
      n.id === activeNoteId ? { ...n, title, content } : n
    ));
    setIsSaving(false);
  };

  const debouncedSave = useCallback((content: JSONContent, text: string) => {
    const handler = setTimeout(() => saveNote(content, text), 1500);
    return () => clearTimeout(handler);
  }, [activeNoteId, user, saveNote]); 

  const cleanupEmptyContent = (html: string): string => {
    html = html.replace(/<li[^>]*>\s*<\/li>/g, '');
    html = html.replace(/<p[^>]*>\s*<\/p>/g, '');
    html = html.replace(/<h[2-3][^>]*>\s*<\/h[2-3]>/g, '');
    html = html.replace(/(<br\s*\/?>\s*){2,}/g, '<br/>');
    return html.trim();
  };

  // --- CONTENT APPROVAL HANDLERS ---
  const handleApproveContent = () => {
    if (!editor) return;
    saveNote(editor.getJSON(), editor.getText());
    setShowApprovalModal(false);
    setPendingApprovalContent('');
  };

  const handleRetryGeneration = async () => {
    if (!editor) return;
    setShowApprovalModal(false);
    editor.chain().focus().undo().run();
    await generateContent(lastGenerationPrompt.prompt, lastGenerationPrompt.context);
  };

  const handleDeleteGenerated = () => {
    if (!editor) return;
    editor.chain().focus().undo().run();
    setShowApprovalModal(false);
    setPendingApprovalContent('');
  };

  const generateContent = async (prompt: string, context: string) => {
    if (!editor) return;
    const { to } = editor.state.selection;
    setIsGenerating(true);

    try {
      editor.chain().focus().setTextSelection(to).run();
      const response = await fetch("/api/generate-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bufferedContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bufferedContent += decoder.decode(value);
      }

      if (bufferedContent) {
        const cleanedContent = cleanupEmptyContent(bufferedContent);
        if (cleanedContent) {
          editor.chain().focus().insertContent(cleanedContent).run();
          setPendingApprovalContent(cleanedContent);
          setLastGenerationPrompt({ prompt, context });
          setShowApprovalModal(true);
        }
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert("Failed to generate AI content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiGeneration = async () => {
    if (!editor || isGenerating) return;
    const { from, to } = editor.state.selection;
    const context = editor.getText();
    let prompt = "";
    if (from !== to) {
      prompt = editor.state.doc.textBetween(from, to, " ");
    } else {
      const { $head } = editor.state.selection;
      const start = $head.start($head.depth);
      const end = $head.end($head.depth);
      prompt = editor.state.doc.textBetween(start, end, " ");
    }
    if (!prompt.trim()) return;
    await generateContent(prompt, context);
  };

  const handlePdfExport = async () => {
    if (!editor) return;
    setExportingPdf(true);
    try {
      const htmlContent = editor.getHTML();
      const noteTitle = notesList.find(n => n.id === activeNoteId)?.title || "Note";
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlContent, title: noteTitle })
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      saveAs(blob, `${noteTitle}.pdf`);
    } catch (e: any) {
      alert(`PDF Export failed: ${e.message}`);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDocxExport = async () => {
    if (!editor) return;
    try {
      const docxStyles = `<style>body { font-family: 'Arial', sans-serif; } ul[data-type="taskList"] { list-style-type: none !important; }</style>`;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${docxStyles}</head><body><h1>${notesList.find(n => n.id === activeNoteId)?.title || "Untitled Note"}</h1>${editor.getHTML()}</body></html>`;
      const blob = await asBlob(html);
      saveAs(blob as Blob, `${notesList.find(n => n.id === activeNoteId)?.title || "note"}.docx`);
    } catch (e) { alert("DOCX Export failed."); }
  };

  const createNewNote = async () => {
    if (!user) return;
    const { data } = await supabase.from('notes').insert({ user_id: user.id, title: "New Note", content: {} }).select().single();
    if (data) {
      setNotesList([data, ...notesList]);
      setActiveNoteId(data.id);
      lastLoadedId.current = null;
    }
  };

  const deleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this note?")) return;
    await supabase.from('notes').delete().eq('id', id);
    setNotesList(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
      editor?.commands.clearContent();
    }
  };

  const handleToggleSelection = (id: string) => {
    const newSet = new Set(selectedNoteIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedNoteIds(newSet);
  };

  if (!editor) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      
      <style jsx global>{`
        .ProseMirror { font-size: 1.05rem; line-height: 1.7; color: #334155; }
        .ProseMirror h1 { font-size: 2.5rem; font-weight: 800; color: #0f172a; margin: 1.5em 0 0.5em; letter-spacing: -0.02em; }
        .ProseMirror h2 { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 1.2em 0 0.4em; }
        .ProseMirror h3 { font-size: 1.4rem; font-weight: 600; color: #334155; margin: 1em 0 0.3em; }
        
        .ProseMirror ul[data-type="taskList"] { list-style: none; padding: 0; margin: 1em 0; }
        .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 0.6em; }
        .ProseMirror ul[data-type="taskList"] li > label { flex-shrink: 0; margin-top: 5px; cursor: pointer; }
        .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] { 
            appearance: none; width: 20px; height: 20px; border: 2px solid #cbd5e1; border-radius: 6px; 
            cursor: pointer; position: relative; transition: all 0.2s; background: white;
        }
        .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked { background: #4f46e5; border-color: #4f46e5; }
        .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
            content: ''; position: absolute; left: 6px; top: 2px; width: 5px; height: 10px;
            border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg);
        }
        .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div { color: #94a3b8; text-decoration: line-through; }
        .ProseMirror ul[data-type="taskList"] li > div { flex: 1; }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* SIDEBAR */}
      <div className={`bg-white border-r border-slate-200 transition-all duration-500 flex flex-col shrink-0 z-30 overflow-hidden ${showSidebar ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-50 min-w-[20rem]">
            <h2 className="font-bold text-xl text-slate-800 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200"><FileText size={20} /></div>
                {isSelectionMode ? `Selected (${selectedNoteIds.size})` : 'Library'}
            </h2>
            <div className="flex items-center gap-2">
                <button onClick={() => {setIsSelectionMode(!isSelectionMode); setSelectedNoteIds(new Set());}} className={`p-2 rounded-xl transition-all ${isSelectionMode ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                  {isSelectionMode ? <X size={20} /> : <Trash2 size={20} />}
                </button>
                {!isSelectionMode && (
                  <button onClick={createNewNote} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-md"><Plus size={22} /></button>
                )}
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-w-[20rem]">
            {notesList.map(note => {
              const isSelected = selectedNoteIds.has(note.id);
              const isActive = activeNoteId === note.id;
              return (
                <div key={note.id} onClick={() => isSelectionMode ? handleToggleSelection(note.id) : setActiveNoteId(note.id)} 
                     className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${isSelectionMode ? (isSelected ? 'bg-red-50 border-red-200' : 'bg-white border-transparent hover:border-slate-200') : (isActive ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-50/50 translate-x-1' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200')}`}>
                  <div className="flex items-start gap-4">
                    {isSelectionMode && (
                      <div className={`mt-1 shrink-0 ${isSelected ? 'text-red-500' : 'text-slate-300'}`}>
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold truncate text-[0.95rem] ${isActive ? 'text-indigo-600' : 'text-slate-700'}`}>{note.title || "Untitled Note"}</div>
                      <div className="flex items-center gap-3 text-[0.7rem] font-medium text-slate-400 mt-1.5 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5"><Calendar size={12}/> {new Date(note.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {!isSelectionMode && (
                    <button onClick={(e) => deleteNote(e, note.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                  )}
                </div>
              );
            })}
        </div>
        
        {isSelectionMode && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <button onClick={async () => { if(confirm(`Delete ${selectedNoteIds.size} notes?`)) { await supabase.from('notes').delete().in('id', Array.from(selectedNoteIds)); setNotesList(prev => prev.filter(n => !selectedNoteIds.has(n.id))); setIsSelectionMode(false); }}} 
                    disabled={selectedNoteIds.size === 0} className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-lg">
              <Trash2 size={18} /> Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* TOOLBAR */}
        <div className="h-20 bg-[#F1F5F9]/60 backdrop-blur-xl border-b border-slate-200 px-6 flex items-center justify-between z-20">
             <div className="flex items-center gap-4">
                <button onClick={() => setShowSidebar(!showSidebar)} className="p-2.5 hover:bg-white rounded-xl text-slate-500 transition-all">{showSidebar ? <ChevronLeft size={22}/> : <Menu size={22}/>}</button>
                <div className="h-8 w-[1px] bg-slate-300/50" />
                
                {/* Font Size Handler */}
                <div className="flex items-center gap-1 bg-white/50 p-1 rounded-xl border border-slate-200/50 ml-2">
                  <Type size={16} className="ml-2 text-slate-400" />
                  <select 
                    onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
                    className="bg-transparent text-sm font-bold text-slate-600 outline-none px-2 cursor-pointer"
                    defaultValue="16px"
                  >
                    <option value="12px">12</option>
                    <option value="14px">14</option>
                    <option value="16px">16</option>
                    <option value="18px">18</option>
                    <option value="24px">24</option>
                    <option value="32px">32</option>
                  </select>
                </div>
             </div>
             
             {/* Toolbar Buttons */}
             <div className="flex gap-1 bg-[#F1F5F9] p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
                <FormatBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={<Bold size={18}/>} />
                <FormatBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={<Italic size={18}/>} />
                <FormatBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={<UnderlineIcon size={18}/>} />
                <FormatBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={<Strikethrough size={18}/>} />
                
                <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />

                <FormatBtn onClick={() => editor.chain().focus().toggleHeading({level:1}).run()} isActive={editor.isActive('heading', {level:1})} icon={<Heading1 size={18}/>} />
                <FormatBtn onClick={() => editor.chain().focus().toggleHeading({level:2}).run()} isActive={editor.isActive('heading', {level:2})} icon={<Heading2 size={18}/>} />
                <FormatBtn onClick={() => editor.chain().focus().toggleHeading({level:3}).run()} isActive={editor.isActive('heading', {level:3})} icon={<Heading3 size={18}/>} />
                
                <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />
                
                {/* <FormatBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={<List size={18}/>} /> */}
                {/* <FormatBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={<ListOrdered size={18}/>} /> */}
                <FormatBtn onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} icon={<ListTodo size={18}/>} />

                <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />

                <FormatBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={<AlignLeft size={18}/>} />
                <FormatBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={<AlignCenter size={18}/>} />
                <FormatBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={<AlignRight size={18}/>} />
             </div>

             <div className="flex items-center gap-3">
                <button onClick={handleDocxExport} className="p-2.5 text-slate-400 hover:text-indigo-600"><FileText size={20}/></button>
                <button onClick={handlePdfExport} className="p-2.5 text-slate-400 hover:text-indigo-600"><Download size={20}/></button>
             </div>
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/50 p-6 sm:p-12 custom-scrollbar relative">
            <div className="max-w-4xl mx-auto min-h-full">
                {activeNoteId ? (
                    <div className="relative group">
                        <EditorContent editor={editor} />
                        {isGenerating && (
                            <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-bounce z-[60] border border-white/10">
                                <Wand2 size={18} className="text-indigo-400 animate-pulse" /> AI Writing...
                            </div>
                        )}
                    </div>
                ) : (
                   <div className="flex flex-col items-center justify-center h-[60vh] text-slate-300">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6"><FileText size={40} className="text-slate-300" /></div>
                        <h3 className="text-xl font-bold text-slate-400">Your canvas is waiting</h3>
                    </div>
                )}
            </div>
        </div>

        {/* FIXED AI APPROVAL BAR */}
        {showApprovalModal && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-6">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 p-2 shadow-2xl rounded-3xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
              <div className="px-5 py-2 hidden md:block border-r border-white/10 mr-2">
                <span className="text-white font-bold text-sm flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-400" /> AI Content
                </span>
              </div>
              <button onClick={handleApproveContent} className="flex-1 py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
                <Check size={18} /> Keep
              </button>
              <button onClick={handleRetryGeneration} className="flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
                <RefreshCw size={18} /> Retry
              </button>
              <button onClick={handleDeleteGenerated} className="flex-1 py-3 px-6 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
                <Trash2 size={18} /> Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const FormatBtn = ({ onClick, isActive, icon }: any) => (
  <button onClick={onClick} className={`p-2.5 rounded-xl transition-all duration-300 ${isActive ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-400 hover:bg-white hover:text-slate-600"}`}>{icon}</button>
);