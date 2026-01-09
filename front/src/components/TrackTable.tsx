import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Trash2, Undo2, FileText, ExternalLink } from 'lucide-react';
import type { TrackedJob, TrackStatus, Priority } from '../types';

// 状态颜色映射
const STATUS_COLORS: Record<TrackStatus, string> = {
    '待投递': 'bg-yellow-100 text-yellow-800',
    '已投递': 'bg-blue-100 text-blue-800',
    '一面': 'bg-purple-100 text-purple-800',
    '二面': 'bg-purple-200 text-purple-900',
    '三面': 'bg-purple-300 text-purple-900',
    '待开奖': 'bg-orange-100 text-orange-800',
    'Offer': 'bg-green-100 text-green-800',
    '拒绝': 'bg-gray-200 text-gray-600',
    '放弃': 'bg-gray-100 text-gray-500',
};

const PRIORITY_LABELS: Record<Priority, string> = {
    'high': '🔴 高',
    'medium': '🟡 中',
    'low': '🟢 低',
};

const ALL_STATUSES: TrackStatus[] = ['待投递', '已投递', '一面', '二面', '三面', '待开奖', 'Offer', '拒绝', '放弃'];
const ALL_PRIORITIES: Priority[] = ['high', 'medium', 'low'];

interface UndoItem {
    job_id: string;
    job_title: string;
    timeout: ReturnType<typeof setTimeout>;
}

export const TrackTable: React.FC = () => {
    const [jobs, setJobs] = useState<TrackedJob[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [undoItem, setUndoItem] = useState<UndoItem | null>(null);
    const [editingNotes, setEditingNotes] = useState<string | null>(null);
    const [notesValue, setNotesValue] = useState('');
    const [filterStatus, setFilterStatus] = useState<TrackStatus | 'all'>('all');
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchJobs = async () => {
        try {
            const res = await axios.get('/api/track/list');
            setJobs(res.data);
        } catch (err) {
            console.error("Failed to fetch tracked jobs", err);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    const filteredJobs = useMemo(() => {
        if (filterStatus === 'all') return jobs;
        return jobs.filter(j => j.track_status === filterStatus);
    }, [jobs, filterStatus]);

    const updateJob = async (job_id: string, updates: Partial<TrackedJob>) => {
        try {
            await axios.put('/api/track/update', { job_id, ...updates });
            fetchJobs();
        } catch (err) {
            console.error("Failed to update job", err);
        }
    };

    const deleteJob = async (job: TrackedJob) => {
        try {
            await axios.delete('/api/track/delete', { data: { job_id: job.job_id } });

            // 设置撤销提示
            const timeout = setTimeout(() => {
                setUndoItem(null);
            }, 30000);
            setUndoItem({ job_id: job.job_id, job_title: job.job_title, timeout });

            fetchJobs();
        } catch (err) {
            console.error("Failed to delete job", err);
        }
    };

    const undoDelete = async () => {
        if (!undoItem) return;
        try {
            await axios.post('/api/track/undo', { job_id: undoItem.job_id });
            clearTimeout(undoItem.timeout);
            setUndoItem(null);
            fetchJobs();
        } catch (err) {
            console.error("Failed to undo delete", err);
            alert("撤销失败：已超过30秒或发生错误");
            setUndoItem(null);
        }
    };

    const saveNotes = async (job_id: string) => {
        await updateJob(job_id, { notes: notesValue });
        setEditingNotes(null);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    };

    // 批量删除
    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            for (const job_id of selectedIds) {
                await axios.delete('/api/track/delete', { data: { job_id } });
            }
            setSelectedIds(new Set());
            fetchJobs();
        } catch (err) {
            console.error("Batch delete failed", err);
            alert("批量删除失败");
        } finally {
            setIsDeleting(false);
        }
    };

    // 全选/取消全选
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredJobs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredJobs.map(j => j.job_id)));
        }
    };

    return (
        <div className="glass-card overflow-hidden border border-white/20">
            <div className="p-6 border-b border-gray-100/50 flex justify-between items-center bg-white/40 backdrop-blur-sm">
                <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2 tracking-tight">
                    <span className="w-1.5 h-6 bg-green-600 rounded-full"></span>
                    追踪列表 (Track)
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">{filteredJobs.length}</span>
                </h3>

                {/* 状态筛选 */}
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBatchDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium hover:bg-red-100 transition-all"
                        >
                            <Trash2 size={16} />
                            {isDeleting ? '删除中...' : `删除 (${selectedIds.size})`}
                        </button>
                    )}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as TrackStatus | 'all')}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">全部状态</option>
                        {ALL_STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 撤销提示 */}
            {undoItem && (
                <div className="mx-6 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between animate-in fade-in duration-200">
                    <span className="text-sm text-yellow-800">
                        已移除「{undoItem.job_title}」，30秒内可撤销
                    </span>
                    <button
                        onClick={undoDelete}
                        className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 transition-colors"
                    >
                        <Undo2 size={14} />
                        撤销
                    </button>
                </div>
            )}

            {/* 表格 */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50/80 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={filteredJobs.length > 0 && selectedIds.size === filteredJobs.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">岗位</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">公司</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">状态</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">优先级</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">添加时间</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">投递时间</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">面试时间</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">备注</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredJobs.map((job) => (
                            <tr key={job.job_id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(job.job_id) ? 'bg-blue-50/50' : ''}`}>
                                {/* 复选框 */}
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(job.job_id)}
                                        onChange={() => {
                                            const newSet = new Set(selectedIds);
                                            if (newSet.has(job.job_id)) {
                                                newSet.delete(job.job_id);
                                            } else {
                                                newSet.add(job.job_id);
                                            }
                                            setSelectedIds(newSet);
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </td>
                                {/* 岗位 */}
                                <td className="px-4 py-3">
                                    <a
                                        href={job.job_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline font-medium flex items-center gap-1"
                                    >
                                        {job.job_title}
                                        <ExternalLink size={12} />
                                    </a>
                                </td>

                                {/* 公司 */}
                                <td className="px-4 py-3 text-gray-700">{job.company_name}</td>

                                {/* 状态 - 下拉选择 */}
                                <td className="px-4 py-3">
                                    <select
                                        value={job.track_status}
                                        onChange={(e) => updateJob(job.job_id, { track_status: e.target.value as TrackStatus })}
                                        className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer ${STATUS_COLORS[job.track_status]}`}
                                    >
                                        {ALL_STATUSES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </td>

                                {/* 优先级 - 下拉选择 */}
                                <td className="px-4 py-3">
                                    <select
                                        value={job.priority}
                                        onChange={(e) => updateJob(job.job_id, { priority: e.target.value as Priority })}
                                        className="px-2 py-1 text-xs rounded border border-gray-200 cursor-pointer"
                                    >
                                        {ALL_PRIORITIES.map(p => (
                                            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                                        ))}
                                    </select>
                                </td>

                                {/* 添加时间 */}
                                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(job.added_at)}</td>

                                {/* 投递时间 - 日期选择 */}
                                <td className="px-4 py-3">
                                    <input
                                        type="date"
                                        value={job.applied_at?.split('T')[0] || ''}
                                        onChange={(e) => updateJob(job.job_id, { applied_at: e.target.value || null })}
                                        className="px-1 py-0.5 text-xs border border-gray-200 rounded cursor-pointer"
                                    />
                                </td>

                                {/* 面试时间 - 日期选择 */}
                                <td className="px-4 py-3">
                                    <input
                                        type="date"
                                        value={job.interview_at?.split('T')[0] || ''}
                                        onChange={(e) => updateJob(job.job_id, { interview_at: e.target.value || null })}
                                        className="px-1 py-0.5 text-xs border border-gray-200 rounded cursor-pointer"
                                    />
                                </td>

                                {/* 备注 - 行内编辑 */}
                                <td className="px-4 py-3">
                                    {editingNotes === job.job_id ? (
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={notesValue}
                                                onChange={(e) => setNotesValue(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveNotes(job.job_id)}
                                                className="px-2 py-1 text-xs border border-gray-300 rounded w-32"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => saveNotes(job.job_id)}
                                                className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
                                            >
                                                保存
                                            </button>
                                        </div>
                                    ) : (
                                        <span
                                            onClick={() => { setEditingNotes(job.job_id); setNotesValue(job.notes); }}
                                            className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 truncate max-w-[120px] block"
                                            title={job.notes || '点击添加备注'}
                                        >
                                            {job.notes || '点击添加...'}
                                        </span>
                                    )}
                                </td>

                                {/* 操作 */}
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => deleteJob(job)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                        title="移除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {filteredJobs.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <FileText size={32} className="text-gray-300 mb-2" />
                                        <p className="font-medium">暂无追踪岗位</p>
                                        <p className="text-sm mt-1">在「岗位列表」中勾选岗位，点击「添加到追踪」</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
