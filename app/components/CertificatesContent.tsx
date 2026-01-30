"use client";
import React from 'react';
import { Award } from 'lucide-react';

export default function CertificatesContent() {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center hover:bg-blue-50/30 transition-all cursor-pointer">
        <Award size={40} className="text-blue-600 mb-4" />
        <h3 className="font-black text-xl text-slate-800">Upload Certificate</h3>
        <p className="text-sm text-slate-400 font-medium">Drag and drop or click to add</p>
      </div>
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
        <h3 className="font-black text-xl text-slate-800 mb-6">Verified Wallet</h3>
        <div className="space-y-4">
          <WalletItem title="Python Basic" issuer="HackerRank" color="bg-yellow-400" />
          <WalletItem title="Data Science 101" issuer="IBM Skills" color="bg-blue-500" />
        </div>
      </div>
    </div>
  );
}

function WalletItem({ title, issuer, color }: any) {
  return (
    <div className="flex items-center gap-5 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white font-black`}>{title[0]}</div>
      <div>
        <p className="font-black text-slate-800 text-sm">{title}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{issuer}</p>
      </div>
    </div>
  );
}