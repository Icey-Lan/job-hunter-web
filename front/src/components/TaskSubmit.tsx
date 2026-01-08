import React, { useState } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';

export const TaskSubmit: React.FC = () => {
    const [urls, setUrls] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async () => {
        if (!urls.trim()) return;
        setLoading(true);
        try {
            const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);
            const res = await axios.post('/api/tasks/submit', { urls: urlList });
            setMessage(`Success: ${res.data.message}`);
            setUrls('');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error submitting tasks');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 min-h-[300px] flex flex-col relative overflow-hidden group">
            {/* Ambient Background Gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500"></div>

            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                <Send size={18} className="text-blue-600" />
                提交任务 (Submit)
            </h2>

            <div className="flex-1 flex flex-col gap-3">
                <div className="relative flex-1">
                    <textarea
                        className="w-full h-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm resize-none transition-all placeholder:text-gray-400"
                        placeholder="在此粘贴 Boss直聘 链接，每行一个..."
                        value={urls}
                        onChange={(e) => setUrls(e.target.value)}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-medium">
                        {urls.split('\n').filter(u => u.trim()).length} 链接
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || !urls.trim()}
                    className="w-full py-3 bg-black text-white rounded-xl font-medium shadow-lg shadow-black/5 hover:bg-gray-800 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:pointer-events-none transition-all duration-200 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        '开始采集 (Start)'
                    )}
                </button>
            </div>

            {message && (
                <div className={`mt-3 text-xs font-medium px-3 py-2 rounded-lg ${message.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    } animate-in fade-in slide-in-from-top-1 duration-200`}>
                    {message}
                </div>
            )}
        </div>
    );
};
