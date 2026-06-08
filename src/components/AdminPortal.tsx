import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Download, LayoutDashboard, Search, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminPortal() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Simple hardcoded password protection (FOR DEMO PURPOSES)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Ideally this should be Firebase Auth
      setIsAuthenticated(true);
      fetchRequests();
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Remove orderBy from query to avoid missing index issues. 
      // Firestore omits documents missing the orderBy field. Sort locally.
      const q = query(collection(db, 'requests')); 
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort locally descending by date (safely handling missing createdAt)
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setRequests(data);
    } catch (error) {
      console.error("Error fetching requests: ", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (requests.length === 0) return;

    // Formatting data for Excel
    const dataToExport = requests.map((req) => {
      // Date formatting could fail if createdAt is missing or not a timestamp yet
      let dateString = '';
      if (req.createdAt && typeof req.createdAt.toDate === 'function') {
        dateString = req.createdAt.toDate().toLocaleString('ar-EG');
      }

      return {
        'رقم الطلب': req.seqId,
        'اسم المرسل': req.name,
        'المؤسسة': req.organization || 'غير محدد',
        'الهاتف': req.phone || 'غير محدد',
        'البريد الإلكتروني': req.email,
        'موضوع الطلب': req.subject,
        'التفاصيل': req.message,
        'الحالة': req.status,
        'تاريخ الطلب': dateString,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");
    
    XLSX.writeFile(workbook, "EQI_IT_Requests.xlsx");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center mb-6 text-slate-800">بوابة الإدارة</h2>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="أدخل كلمة المرور"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 mb-4 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
            دخول
          </button>
          <p className="text-center text-slate-400 text-xs mt-4">كلمة المرور: admin123</p>
        </form>
      </div>
    );
  }

  const filteredRequests = requests.filter(req => 
    Object.values(req).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">سجل الطلبات</h1>
              <p className="text-sm text-slate-500">متابعة وإدارة طلبات الدعم الفني</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="بحث في الطلبات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <button 
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              تصدير إلى Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">رقم الطلب</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">تاريخ الطلب</th>
                  <th className="px-6 py-4 font-medium">المرسل</th>
                  <th className="px-6 py-4 font-medium">المؤسسة / الهاتف</th>
                  <th className="px-6 py-4 font-medium min-w-[200px]">الموضوع</th>
                  <th className="px-6 py-4 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      لا توجد طلبات مطابقة
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-xs">
                          {req.seqId}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString('ar-EG') : ''}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{req.name}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{req.email}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div>{req.organization || '-'}</div>
                        <div className="text-xs text-slate-400 mt-0.5" dir="ltr">{req.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 mb-1">{req.subject}</div>
                        <div className="text-slate-500 text-xs line-clamp-2" title={req.message}>{req.message}</div>
                        <div className="text-indigo-500 text-[11px] mt-1 italic">المرفقات ترسل عبر البريد الإلكتروني</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-medium border border-amber-200/50">
                          {req.status === 'pending' ? 'قيد الانتظار' : req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
