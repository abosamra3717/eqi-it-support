import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Headset, Send, CheckCircle2, AlertCircle, Building2, Paperclip, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../firestore';

export default function SupportForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    subject: '',
    message: ''
  });
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSeqId, setLastSeqId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalSize = [...files, ...newFiles].reduce((acc, file) => acc + file.size, 0);
      
      // Limit to ~20MB total to avoid server/email rejection
      if (totalSize > 20 * 1024 * 1024) {
        alert('إجمالي حجم المرفقات يجب ألا يتجاوز 20 ميجابايت');
        return;
      }
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const seqId = 'REQ-' + Date.now().toString().slice(-5) + Math.random().toString(36).substring(2, 4).toUpperCase();
      setLastSeqId(seqId);

      // 1. Save to Firebase
      const requestRef = doc(collection(db, 'requests'), seqId);
      await setDoc(requestRef, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        organization: formData.organization,
        subject: formData.subject,
        message: formData.message,
        status: 'pending',
        seqId: seqId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Send the email via backend API with form data
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('organization', formData.organization);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('message', formData.message);
      formDataToSend.append('seqId', seqId);
      
      files.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      const response = await fetch('/api/send-email', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.warn('Failed to send email, but saved to db:', errorData);
      }

      setStatus('success');
      setFormData({ name: '', email: '', phone: '', organization: '', subject: '', message: '' });
      setFiles([]);
      
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message.includes("permission denied")) {
         try {
            handleFirestoreError(error, OperationType.CREATE, 'requests');
         } catch (detailedError) {
             console.error("Detailed Permission Error", detailedError);
         }
      }
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden shadow-slate-200/50">
        <div className="flex flex-col md:flex-row">
          
          {/* Informational Sidebar */}
          <div className="md:w-2/5 bg-slate-900 text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
             {/* Decorative blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                   <Building2 className="w-5 h-5 text-indigo-300" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">EQI IT</h2>
              </div>
              <h3 className="text-2xl font-bold mb-4">كيف يمكننا مساعدتك؟</h3>
              <p className="text-slate-300 mb-8 leading-relaxed text-sm">
                نحن هنا للإجابة على استفساراتك وتقديم الدعم الفني اللازم. املأ النموذج وسيتواصل معك فريقنا في أقرب وقت.
              </p>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 text-sm text-slate-300 mb-4">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <Headset className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">راسلنا مباشرة</p>
                  <p className="font-medium text-white break-all">asamir@eqi-it.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="md:w-3/5 p-8 md:p-10">
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center py-12"
                >
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">تم استلام طلبك!</h3>
                  <p className="text-slate-600 mb-2 max-w-sm mx-auto leading-relaxed">
                    شكراً لتواصلك معنا. تم حفظ البيانات بنجاح وسيتم إرسالها إلى فريق الدعم في EQI IT.
                  </p>
                  <p className="text-slate-900 font-bold mb-8 text-lg bg-slate-100 px-4 py-2 rounded-lg">
                    رقم الطلب: {lastSeqId}
                  </p>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    إرسال طلب جديد
                  </button>
                </motion.div>
              ) : (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">الاسم الكامل</label>
                      <input 
                        required
                        type="text" 
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
                        placeholder="أدخل اسمك"
                      />
                    </div>

                    <div>
                      <label htmlFor="organization" className="block text-sm font-medium text-slate-700 mb-1.5">اسم المؤسسة</label>
                      <input 
                        type="text" 
                        id="organization"
                        name="organization"
                        value={formData.organization}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
                        placeholder="المؤسسة / الشركة"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">رقم الهاتف</label>
                        <input 
                          type="tel" 
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white text-left"
                          dir="ltr"
                          placeholder="01xxxxxxxxx"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">البريد الإلكتروني</label>
                        <input 
                          required
                          type="email" 
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white text-left"
                          placeholder="email@example.com"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1.5">موضوع الطلب</label>
                      <input 
                        required
                        type="text" 
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white"
                        placeholder="عن ماذا تبحث؟"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1.5">تفاصيل الطلب</label>
                      <textarea 
                        required
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white resize-none"
                        placeholder="اشرح لنا المشكلة أو الطلب بالتفصيل..."
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">المرفقات (اختياري)</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          multiple
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                        />
                        <label 
                          htmlFor="file-upload" 
                          className="w-full border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all text-sm text-slate-500 text-center"
                        >
                          <Paperclip className="w-5 h-5 text-indigo-400 mb-1" />
                          <span>اضغط لإرفاق صور أو مستندات (الحد الأقصى 20 ميجابايت)</span>
                        </label>
                        {files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {files.map((f, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-xs border border-slate-200">
                                <span className="truncate max-w-[150px]">{f.name}</span>
                                <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {status === 'error' && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 text-red-800 text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>لم نتمكن من إرسال الطلب. حاول مرة أخرى: {errorMessage}</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg border border-transparent shadow-sm shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {status === 'loading' ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        إرسال الطلب
                        <Send className="w-4 h-4 mr-1 rotate-180" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1.5">
                    البيانات محفوظة و مشفرة 
                    <Building2 className="w-3 h-3" />
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
