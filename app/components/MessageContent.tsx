"use client";
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

interface MessageContentProps {
  content: string;
  isUser?: boolean;
}

export default function MessageContent({ content, isUser = false }: MessageContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isUser) {
    return <p className="text-sm md:text-base leading-relaxed font-medium whitespace-pre-wrap">{content}</p>;
  }

  return (
    <div className="prose prose-sm md:prose-base max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-black text-slate-900 mt-4 mb-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold text-slate-800 mt-3 mb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-bold text-slate-700 mt-2 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-sm md:text-base leading-relaxed text-slate-700 my-2" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-2 text-slate-700" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-slate-700" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-sm md:text-base leading-relaxed ml-2" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-slate-900" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-slate-800" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              return (
                <div className="relative group my-3">
                  <div className="flex items-center justify-between bg-slate-800 text-slate-300 px-4 py-2 rounded-t-xl text-xs font-semibold">
                    <span>{match[1]}</span>
                    <button
                      onClick={() => handleCopyCode(codeString)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-700 transition-colors"
                    >
                      {copiedCode === codeString ? (
                        <>
                          <Check size={14} className="text-green-400" />
                          <span className="text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="!mt-0 !rounded-t-none !rounded-b-xl overflow-x-auto bg-slate-900">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            }
            
            return (
              <code
                className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }) => (
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto my-3" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-600 my-3" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-blue-600 hover:text-blue-700 underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-slate-300" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-slate-300 bg-slate-100 px-4 py-2 text-left font-bold text-slate-800" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-slate-300 px-4 py-2 text-slate-700" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
