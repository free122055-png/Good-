import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy
} from 'firebase/firestore';

interface VerificationRequest {
  id: string;
  uid: string;
  username: string;
  legalName: string;
  dob: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reason?: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, triggerToast }) => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'verificationRequests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs: VerificationRequest[] = [];
      snapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() } as VerificationRequest);
      });
      reqs.sort((a, b) => {
        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return timeB - timeA;
      });
      setRequests(reqs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleApprove = async (request: VerificationRequest) => {
    try {
      // 1. Update request status
      const reqRef = doc(db, 'verificationRequests', request.id);
      await updateDoc(reqRef, { status: 'approved' });

      // 2. Update user profile
      const userRef = doc(db, 'users', request.uid);
      await updateDoc(userRef, {
        isVerified: true,
        blueBadge: true,
        verificationStatus: 'approved'
      });

      triggerToast(`✅ ${request.username} এপ্রুভ করা হয়েছে!`);
    } catch (err) {
      console.error('Error approving request:', err);
      triggerToast('❌ এপ্রুভ করতে সমস্যা হয়েছে।');
    }
  };

  const handleReject = async (request: VerificationRequest) => {
    const reason = window.prompt('প্রত্যাখ্যানের কারণ লিখুন:', 'তথ্য অসম্পূর্ণ বা অস্পষ্ট।');
    if (reason === null) return;

    try {
      // 1. Update request status
      const reqRef = doc(db, 'verificationRequests', request.id);
      await updateDoc(reqRef, { 
        status: 'rejected',
        reason: reason
      });

      // 2. Update user profile
      const userRef = doc(db, 'users', request.uid);
      await updateDoc(userRef, {
        isVerified: false,
        blueBadge: false,
        verificationStatus: 'rejected'
      });

      triggerToast(`❌ ${request.username} রিজেক্ট করা হয়েছে।`);
    } catch (err) {
      console.error('Error rejecting request:', err);
      triggerToast('❌ রিজেক্ট করতে সমস্যা হয়েছে।');
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!window.confirm('আপনি কি এই রিকোয়েস্টটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'verificationRequests', requestId));
      triggerToast('🗑️ রিকোয়েস্ট মুছে ফেলা হয়েছে।');
    } catch (err) {
      triggerToast('❌ মুছতে সমস্যা হয়েছে।');
    }
  };

  if (!isOpen) return null;

  const filteredRequests = requests.filter(req => {
    const matchesFilter = filter === 'all' || req.status === filter;
    const matchesSearch = req.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.legalName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-slate-950 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-blue-400" />
          <h1 className="font-black text-lg tracking-tight uppercase">BINISTA Admin Portal</h1>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 bg-white border-b border-slate-200 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by username or legal name..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all shrink-0 ${
                filter === f 
                ? 'bg-slate-950 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f} ({requests.filter(r => f === 'all' || r.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <Clock className="w-8 h-8 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading Requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <AlertCircle className="w-12 h-12" />
            <span className="text-xs font-bold uppercase tracking-wider">No requests found</span>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">@{req.username}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">UID: {req.uid.slice(0, 8)}...</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                  req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  req.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {req.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Legal Name</span>
                  <span className="text-xs font-extrabold text-slate-800">{req.legalName}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">DOB</span>
                  <span className="text-xs font-extrabold text-slate-800">{req.dob}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase">Submitted At</span>
                  <span className="text-[10px] font-bold text-slate-600">{new Date(req.submittedAt).toLocaleString()}</span>
                </div>
                {req.status === 'rejected' && (
                   <div className="col-span-2 border-t border-slate-200 pt-2 mt-1">
                      <span className="block text-[9px] text-rose-400 font-bold uppercase">Rejection Reason</span>
                      <span className="text-[10px] font-bold text-rose-600">{req.reason}</span>
                   </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {req.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(req)}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                
                {req.status !== 'pending' && (
                   <button
                     onClick={() => handleDelete(req.id)}
                     className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                   >
                     <Trash2 className="w-4 h-4" />
                     Delete Record
                   </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <p className="text-[10px] text-center text-slate-400 font-medium">
          BINISTA Verification Management System v2.0
        </p>
      </div>
    </div>
  );
};
