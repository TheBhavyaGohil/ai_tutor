"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X, Send, Loader2, MessageSquare, CheckCircle2, Menu, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import NotificationOverlay, { NotificationType } from './NotificationOverlay';
import MessageContent from './MessageContent';

interface UploadedFile {
  id: string;
  name: string;
  content: string;
  uploadedAt: Date;
  file_size?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function pdf_tutorContent() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [userId, setUserId] = useState<string>('default_user');
  
  // Mobile Responsiveness State
  const [showMobileFiles, setShowMobileFiles] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const id = data?.user?.id || data?.user?.email || 'default_user';
      setUserId(id);
      await loadPDFsFromDatabase(id);
    };
    init();
  }, []);

  const loadPDFsFromDatabase = async (uid: string) => {
    try {
      setLoadingFiles(true);
      const { data, error } = await supabase
        .from('pdfs')
        .select('*')
        .eq('user_id', uid)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.warn('Database query failed:', error);
        setUploadedFiles([]);
        return;
      }

      if (data && data.length > 0) {
        const files: UploadedFile[] = data.map(pdf => ({
          id: pdf.id,
          name: pdf.file_name,
          content: pdf.content,
          uploadedAt: new Date(pdf.uploaded_at),
          file_size: pdf.file_size
        }));
        setUploadedFiles(files);
      } else {
        setUploadedFiles([]);
      }
    } catch (error) {
      console.warn('Error loading PDFs:', error);
      setUploadedFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      showNotification('Please upload only PDF files', 'error');
      return;
    }

    try {
      const text = await extractTextFromPDF(file);
      
      const { data, error } = await supabase
        .from('pdfs')
        .insert([
          {
            user_id: userId,
            file_name: file.name,
            content: text,
            file_size: file.size
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const newFile: UploadedFile = {
        id: data.id,
        name: data.file_name,
        content: data.content,
        uploadedAt: new Date(data.uploaded_at),
        file_size: data.file_size
      };
      
      setUploadedFiles(prev => [newFile, ...prev]);
      showNotification('PDF uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading file:', error);
      showNotification('Failed to upload file', 'error');
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdfjsLib = await import('pdfjs-dist');
          const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
            new Blob([pdfjsWorker], { type: 'application/javascript' })
          );
          
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
          }
          resolve(fullText || 'Could not extract text from PDF');
        } catch (error) {
          console.error('PDF parsing error:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const selectFileForChat = (file: UploadedFile) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        const newSelection = prev.filter(f => f.id !== file.id);
        if (newSelection.length === 0) setMessages([]);
        return newSelection;
      } else {
        const newSelection = [...prev, file];
        if (prev.length === 0) {
          setMessages([{
            role: 'assistant',
            content: `I'm ready to help you understand "${file.name}". Ask me anything about ${newSelection.length === 1 ? 'this document' : 'these documents'}!`
          }]);
          if (window.innerWidth < 1024) {
            setShowMobileFiles(false);
          }
        } else {
          setMessages(prevMsg => [...prevMsg, {
            role: 'assistant',
            content: `Added "${file.name}" to our conversation.`
          }]);
        }
        return newSelection;
      }
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || selectedFiles.length === 0 || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          files: selectedFiles.map(f => ({
            name: f.name,
            content: f.content
          })),
          conversationHistory: messages
        })
      });

      const data = await response.json();
      
      if (data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = async (id: string) => {
    try {
      const { error } = await supabase.from('pdfs').delete().eq('id', id);
      if (error) throw error;

      setUploadedFiles(prev => prev.filter(f => f.id !== id));
      setSelectedFiles(prev => {
        const newSelection = prev.filter(f => f.id !== id);
        if (newSelection.length === 0) setMessages([]);
        return newSelection;
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      showNotification('Failed to delete file', 'error');
    }
  };

  return (
    <div className="h-full w-full p-2 md:p-4 font-sans">
      <NotificationOverlay
        open={!!notification}
        message={notification?.message || ''}
        type={notification?.type || 'info'}
        onClose={() => setNotification(null)}
      />

      <div className="w-full h-full bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col lg:flex-row relative">
        
        {/* Mobile Toggle Button */}
        <div className="lg:hidden p-4 border-b border-slate-100 bg-white shrink-0">
          <button
            onClick={() => setShowMobileFiles(!showMobileFiles)}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            {showMobileFiles ? <ArrowLeft size={16} /> : <Menu size={16} />}
            {showMobileFiles ? 'Back to Chat' : 'My Documents'}
          </button>
        </div>

        {/* Left Panel - File Upload & List */}
        <div className={`w-full lg:w-96 flex flex-col gap-4 p-4 lg:p-6 border-r border-slate-100 overflow-hidden ${
          showMobileFiles ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl lg:rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all shrink-0 ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:bg-blue-50/30 bg-white'
            }`}
          >
            <Upload size={28} className="lg:w-[32px] lg:h-[32px] text-blue-600 mb-2 lg:mb-3" />
            <h3 className="font-black text-base lg:text-lg text-slate-800">Upload PDF</h3>
            <p className="text-xs lg:text-sm text-slate-400 font-medium">Drag and drop or click</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Uploaded Files List */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="font-black text-base lg:text-lg text-slate-800 mb-3 flex items-center gap-2 sticky top-0 bg-white z-10 pb-2 border-b border-slate-100">
              <FileText size={18} className="lg:w-[20px]" />
              My Documents
              {selectedFiles.length > 0 && (
                <span className="ml-auto text-xs text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-lg">
                  {selectedFiles.length} selected
                </span>
              )}
            </h3>
            <div className="space-y-2">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="lg:w-[24px] animate-spin text-blue-600" />
                </div>
              ) : uploadedFiles.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-slate-400">No PDFs uploaded yet.</p>
                  <p className="text-xs text-slate-300 mt-1">Upload a file to get started.</p>
                </div>
              ) : (
                uploadedFiles.map(file => {
                  const isSelected = selectedFiles.some(f => f.id === file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => selectFileForChat(file)}
                      className={`flex items-center justify-between p-3 rounded-xl lg:rounded-2xl cursor-pointer transition-all group ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-400 shadow-sm'
                          : 'hover:bg-slate-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 lg:w-10 h-9 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-blue-600' : 'bg-slate-200 group-hover:bg-slate-300'
                        }`}>
                          {isSelected ? <CheckCircle2 size={16} className="lg:w-[18px]" /> : <FileText size={16} className="lg:w-[18px] text-slate-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {file.uploadedAt.toLocaleDateString()}
                            {file.file_size && ` • ${(file.file_size / 1024).toFixed(0)} KB`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={14} className="text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Chat Interface */}
        <div className={`flex-1 flex flex-col overflow-hidden ${
          showMobileFiles ? 'hidden lg:flex' : 'flex'
        }`}>
          {selectedFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 lg:p-8">
              <div className="w-16 lg:w-20 h-16 lg:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={28} className="lg:w-[32px] text-slate-300" />
              </div>
              <h3 className="font-black text-xl lg:text-2xl text-slate-800 mb-2">Select Documents</h3>
              <p className="text-slate-400 max-w-xs mx-auto text-sm">Select a PDF from the sidebar to start chatting with your AI Tutor.</p>
              <button 
                onClick={() => setShowMobileFiles(true)}
                className="mt-6 lg:hidden px-6 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors"
              >
                Select File
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="border-b border-slate-100 p-4 lg:p-6 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg lg:rounded-xl flex items-center justify-center text-white font-black text-sm lg:text-base shadow-lg shadow-blue-200">
                    {selectedFiles.length}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm lg:text-lg text-slate-800 truncate">
                      {selectedFiles.length === 1 
                        ? selectedFiles[0].name 
                        : `${selectedFiles.length} Documents`}
                    </h3>
                    <p className="text-xs lg:text-sm text-slate-400">
                      AI Tutor Active
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-slate-50/30">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] lg:max-w-[75%] rounded-2xl p-3 lg:p-4 shadow-sm text-xs lg:text-base ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white border border-slate-200 rounded-tl-sm text-slate-700'
                      }`}
                    >
                      <MessageContent content={msg.content} isUser={msg.role === 'user'} />
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                      <Loader2 size={18} className="lg:w-[20px] animate-spin text-blue-600" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-slate-100 p-4 lg:p-6 bg-white shrink-0">
                <div className="flex gap-2 lg:gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask a question..."
                    className="flex-1 px-4 lg:px-6 py-2.5 lg:py-4 rounded-lg lg:rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-400 focus:outline-none font-medium text-sm lg:text-base transition-all"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className="px-4 lg:px-6 py-2.5 lg:py-4 bg-blue-600 text-white rounded-lg lg:rounded-2xl font-black hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 flex-shrink-0"
                  >
                    <Send size={18} className="lg:w-[20px]" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}