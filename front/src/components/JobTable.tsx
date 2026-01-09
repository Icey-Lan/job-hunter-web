import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Download, RefreshCw, Briefcase, Trash2, Filter, Settings, Eye, Copy, Target } from 'lucide-react';
import type { Job } from '../types';

// Column definition
type ColumnId = 'job_title' | 'salary' | 'company_name' | 'location' | 'experience_education' | 'job_tags' | 'benefits' | 'scraped_at' | 'work_address' | 'job_description' | 'recruiter' | 'action';

interface ColumnConfig {
    id: ColumnId;
    label: string;
    isFixed?: boolean;
    isDefault?: boolean;
    width?: string;
}

const ALL_COLUMNS: ColumnConfig[] = [
    { id: 'job_title', label: '岗位', isFixed: true, width: '200px' },
    { id: 'company_name', label: '公司', isFixed: true, width: '180px' },
    { id: 'salary', label: '薪资', isDefault: true, width: '140px' },
    { id: 'location', label: '城市', isDefault: true, width: '100px' },
    { id: 'experience_education', label: '经验/学历', isDefault: true, width: '140px' },
    { id: 'job_tags', label: '岗位标签', isDefault: true, width: '220px' },
    { id: 'benefits', label: '福利待遇', isDefault: true, width: '220px' },

    // Optional
    { id: 'scraped_at', label: '采集时间', width: '140px' },
    { id: 'work_address', label: '详细地址', width: '240px' },
    { id: 'recruiter', label: '招聘者', width: '160px' },
    { id: 'job_description', label: '岗位描述', width: '300px' },

    { id: 'action', label: '操作', isFixed: true, width: '100px' },
];

export const JobTable: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter State - Multi-select company filter
    const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(() => {
        const defaults = new Set<ColumnId>();
        ALL_COLUMNS.forEach(col => {
            if (col.isFixed || col.isDefault) {
                defaults.add(col.id);
            }
        });
        return defaults;
    });
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState<{ x: number, y: number, content: string } | null>(null);

    // Tooltip Timeout Ref
    const tooltipTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTooltipEnter = (rect: DOMRect, content: string) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setActiveTooltip({
            x: rect.left,
            y: rect.bottom + 5,
            content
        });
    };

    const handleTooltipLeave = () => {
        tooltipTimeoutRef.current = setTimeout(() => {
            setActiveTooltip(null);
        }, 300); // 300ms grace period
    };

    const fetchJobs = async () => {
        try {
            const res = await axios.get('/api/jobs');
            setJobs(res.data);
            // Note: We intentionally do NOT clear selectedUrls here
            // User selections should persist across data refreshes
        } catch (err) {
            console.error("Failed to fetch jobs", err);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    // Derived Data
    const uniqueCompanies = useMemo(() => {
        // Extract unique, non-empty company names
        const companies = new Set(jobs.map(j => j.company_name).filter(Boolean));
        return Array.from(companies).sort();
    }, [jobs]);

    const filteredJobs = useMemo(() => {
        if (selectedCompanies.size === 0) return jobs;
        return jobs.filter(j => selectedCompanies.has(j.company_name));
    }, [jobs, selectedCompanies]);

    // Toggle company in multi-select filter
    const toggleCompanyFilter = (company: string) => {
        const newSet = new Set(selectedCompanies);
        if (newSet.has(company)) {
            newSet.delete(company);
        } else {
            newSet.add(company);
        }
        setSelectedCompanies(newSet);
    };


    const handleExport = (format: 'json' | 'csv') => {
        window.open(`http://localhost:8000/api/export?format=${format}`, '_blank');
    };

    const toggleSelectAll = () => {
        if (selectedUrls.size === filteredJobs.length && filteredJobs.length > 0) {
            setSelectedUrls(new Set());
        } else {
            setSelectedUrls(new Set(filteredJobs.map(j => j.job_url)));
        }
    };

    const toggleSelect = (url: string) => {
        const newSet = new Set(selectedUrls);
        if (newSet.has(url)) {
            newSet.delete(url);
        } else {
            newSet.add(url);
        }
        setSelectedUrls(newSet);
    };

    const handleDelete = async () => {
        if (selectedUrls.size === 0) return;
        if (!confirm(`确认删除选中的 ${selectedUrls.size} 个岗位吗？`)) return;

        setIsDeleting(true);
        try {
            await axios.post('/api/jobs/delete', { urls: Array.from(selectedUrls) });
            await fetchJobs();
        } catch (err) {
            console.error("Delete failed", err);
            alert("删除失败，请重试");
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleColumn = (id: ColumnId) => {
        const newSet = new Set(visibleColumns);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setVisibleColumns(newSet);
    };

    // Helper to render cell content based on column ID
    const renderCell = (colId: ColumnId, job: Job) => {
        switch (colId) {
            case 'job_title':
                return (
                    <div className="font-medium text-gray-900">{job.job_title}</div>
                );
            case 'salary':
                return (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/50 text-sm">{job.salary}</span>
                );
            case 'company_name':
                return (
                    <>
                        <div className="text-gray-900 font-medium">{job.company_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{job.company_industry} · {job.company_size} · {job.company_financing}</div>
                    </>
                );
            case 'location':
                return <span className="text-gray-600 font-medium">{job.location}</span>;
            case 'experience_education':
                return (
                    <div className="flex flex-col gap-1 text-sm text-gray-500">
                        <span>{job.experience_required}</span>
                        <span>{job.education_required}</span>
                    </div>
                );
            case 'job_tags':
                return (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {job.job_tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 truncate max-w-full">
                                {tag}
                            </span>
                        ))}
                        {job.job_tags.length > 2 && (
                            <div className="relative group/tooltip">
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200 cursor-help">
                                    +{job.job_tags.length - 2}
                                </span>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none">
                                    <div className="flex flex-wrap gap-1">
                                        {job.job_tags.map(t => <span key={t} className="bg-gray-700 px-1 rounded">{t}</span>)}
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'benefits':
                return (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {job.benefits.slice(0, 2).map((b, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 truncate max-w-full">
                                {b}
                            </span>
                        ))}
                        {job.benefits.length > 2 && (
                            <div className="relative group/tooltip">
                                <span className="text-[10px] text-gray-400 cursor-help">+{job.benefits.length - 2}</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none">
                                    <div className="flex flex-wrap gap-1">
                                        {job.benefits.map(t => <span key={t} className="bg-gray-700 px-1 rounded">{t}</span>)}
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'scraped_at':
                return <span className="text-xs text-gray-400 whitespace-nowrap">{job.scraped_at || '-'}</span>;
            case 'work_address':
                return <span className="text-xs text-gray-500 block" title={job.work_address}>{job.work_address || '-'}</span>;
            case 'recruiter':
                return (
                    <div className="text-xs text-gray-600">
                        <div className="font-medium">{job.recruiter.name}</div>
                        <div className="text-gray-400 scale-90 origin-left flex flex-wrap items-center gap-1">
                            <span>{job.recruiter.title}</span>
                            {job.recruiter.status && (
                                <>
                                    <span>·</span>
                                    <span className={`
                                        ${job.recruiter.status.includes('活跃') ? 'text-green-600' : 'text-gray-400'}
                                    `}>
                                        {job.recruiter.status}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                );
            case 'job_description':
                return (
                    <div
                        className="cursor-pointer"
                        onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            handleTooltipEnter(rect, job.job_description);
                        }}
                        onMouseLeave={handleTooltipLeave}
                    >
                        <span className="text-xs text-gray-400 block hover:text-gray-600 line-clamp-3">
                            {job.job_description.slice(0, 100)}...
                        </span>
                    </div>
                );
            case 'action':
                return (
                    <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline">
                        查看 <span className="text-xs">↗</span>
                    </a>
                );
            default:
                return null;
        }
    };

    return (
        <div className="glass-card overflow-hidden border border-white/20" onClick={() => {
            if (isFilterOpen) setIsFilterOpen(false);
            if (isColumnMenuOpen) setIsColumnMenuOpen(false);
        }}>
            <div className="p-6 border-b border-gray-100/50 flex justify-between items-center bg-white/40 backdrop-blur-sm relative z-50">
                <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2 tracking-tight">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    岗位列表 (Jobs)
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">{filteredJobs.length}</span>
                </h3>
                <div className="flex gap-3">
                    {selectedUrls.size > 0 && (
                        <>
                            <button
                                onClick={() => {
                                    const selectedJobs = jobs.filter(j => selectedUrls.has(j.job_url));
                                    const mdText = selectedJobs.map(job => {
                                        return `### ${job.job_title} | ${job.company_name}\n` +
                                            `* **薪资**: ${job.salary}\n` +
                                            `* **地点**: ${job.location} ${job.work_address ? '· ' + job.work_address : ''}\n` +
                                            `* **要求**: ${job.experience_required} | ${job.education_required}\n` +
                                            `* **链接**: [点击查看](${job.job_url})\n\n` +
                                            `> **面试官**: ${job.recruiter.name} · ${job.recruiter.title} ${job.recruiter.status ? '(' + job.recruiter.status + ')' : ''}\n\n` +
                                            `**岗位描述**:\n${job.job_description}\n` +
                                            `---`;
                                    }).join('\n\n');

                                    navigator.clipboard.writeText(mdText).then(() => {
                                        alert(`已复制 ${selectedJobs.length} 个岗位的 Markdown 信息！`);
                                    });
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all shadow-sm animate-in fade-in slide-in-from-right-4 duration-200"
                            >
                                <Copy size={16} />
                                复制 MD ({selectedUrls.size})
                            </button>
                            <button
                                onClick={async () => {
                                    const selectedJobs = jobs.filter(j => selectedUrls.has(j.job_url));
                                    let successCount = 0;
                                    let failCount = 0;

                                    for (const job of selectedJobs) {
                                        try {
                                            await axios.post('/api/track/add', {
                                                job_url: job.job_url,
                                                job_title: job.job_title,
                                                company_name: job.company_name
                                            });
                                            successCount++;
                                        } catch (err: any) {
                                            if (err.response?.status === 400) {
                                                // 已存在，跳过
                                                failCount++;
                                            } else {
                                                console.error("Failed to add to track", err);
                                                failCount++;
                                            }
                                        }
                                    }

                                    if (successCount > 0) {
                                        alert(`成功添加 ${successCount} 个岗位到追踪列表！${failCount > 0 ? `（${failCount} 个已存在）` : ''}`);
                                        setSelectedUrls(new Set());
                                    } else if (failCount > 0) {
                                        alert(`所选 ${failCount} 个岗位均已在追踪列表中`);
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 border border-green-100 rounded-lg text-sm font-medium hover:bg-green-100 transition-all shadow-sm animate-in fade-in slide-in-from-right-4 duration-200"
                            >
                                <Target size={16} />
                                添加追踪 ({selectedUrls.size})
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium hover:bg-red-100 transition-all shadow-sm animate-in fade-in slide-in-from-right-4 duration-200"
                            >
                                <Trash2 size={16} />
                                {isDeleting ? '删除中...' : `删除 (${selectedUrls.size})`}
                            </button>
                        </>
                    )}

                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsColumnMenuOpen(!isColumnMenuOpen);
                                setIsFilterOpen(false); // Close other menu
                            }}
                            className={`p-2 rounded-lg transition-colors hover:text-gray-900 ${isColumnMenuOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                            title="Column Settings"
                        >
                            <Settings size={18} />
                        </button>

                        {isColumnMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-[60] py-2 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                <div className="px-4 py-2 border-b border-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    字段显示 (Visible Columns)
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {ALL_COLUMNS.map(col => (
                                        <div
                                            key={col.id}
                                            className={`px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 cursor-pointer ${col.isFixed ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={() => !col.isFixed && toggleColumn(col.id)}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                                                ${(visibleColumns.has(col.id) || col.isFixed)
                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                    : 'border-gray-300 bg-white'}`}
                                            >
                                                {(visibleColumns.has(col.id) || col.isFixed) && <Eye size={10} />}
                                            </div>
                                            <span className="text-gray-700">{col.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={() => fetchJobs()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        <Download size={16} /> 导出 CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-4 py-3 w-[60px] sticky left-0 z-40 bg-gray-50/50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={filteredJobs.length > 0 && selectedUrls.size === filteredJobs.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>

                            {/* Dynamic Headers */}
                            {ALL_COLUMNS.map(col => {
                                if (!col.isFixed && !visibleColumns.has(col.id)) return null;

                                // Sticky Logic for Headers
                                let stickyClass = '';
                                let stickyStyle: React.CSSProperties = {};

                                if (col.id === 'job_title') {
                                    stickyClass = 'sticky left-[60px] z-30 bg-gray-50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]';
                                } else if (col.id === 'company_name') {
                                    stickyClass = 'sticky left-[260px] z-30 bg-gray-50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]';
                                } else if (col.id === 'action') {
                                    stickyClass = 'sticky right-0 z-30 bg-gray-50 shadow-[-1px_0_0_0_rgba(0,0,0,0.05)]';
                                }

                                // Special rendering for Company header to include filter
                                if (col.id === 'company_name') {
                                    return (
                                        <th key={col.id} className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider relative group ${stickyClass}`} style={{ ...stickyStyle, minWidth: col.width, maxWidth: col.width, width: col.width }}>
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsFilterOpen(!isFilterOpen);
                                                    setIsColumnMenuOpen(false);
                                                }}
                                            >
                                                {col.label}
                                                {selectedCompanies.size > 0 && (
                                                    <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded-full font-bold">
                                                        {selectedCompanies.size}
                                                    </span>
                                                )}
                                                <Filter size={14} className={selectedCompanies.size > 0 ? 'text-blue-600 fill-blue-600' : ''} />
                                            </div>

                                            {isFilterOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-200"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {/* Header with Clear button */}
                                                    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-gray-500 uppercase">公司筛选</span>
                                                        {selectedCompanies.size > 0 && (
                                                            <button
                                                                onClick={() => setSelectedCompanies(new Set())}
                                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                            >
                                                                清除全部
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto">
                                                        {uniqueCompanies.map(company => (
                                                            <div
                                                                key={company}
                                                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${selectedCompanies.has(company) ? 'bg-blue-50/50' : ''}`}
                                                                onClick={() => toggleCompanyFilter(company)}
                                                            >
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                                                                    ${selectedCompanies.has(company)
                                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                                        : 'border-gray-300 bg-white'}`}
                                                                >
                                                                    {selectedCompanies.has(company) && <span className="text-[10px]">✓</span>}
                                                                </div>
                                                                <span className="truncate flex-1 text-gray-700">{company}</span>
                                                                <span className="text-xs text-gray-400">
                                                                    {jobs.filter(j => j.company_name === company).length}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                    );
                                }

                                return (
                                    <th key={col.id} className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${stickyClass}`} style={{ ...stickyStyle, minWidth: col.width, maxWidth: col.width, width: col.width }}>
                                        {col.label}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-gray-50">
                        {filteredJobs.map((job, idx) => (
                            <tr key={idx} className={`group transition-colors ${selectedUrls.has(job.job_url) ? 'bg-blue-50/50' : 'hover:bg-white/60'} hover:relative hover:z-[80]`}>
                                <td className="px-4 py-3 sticky left-0 z-20 bg-white group-hover:bg-blue-50/50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={selectedUrls.has(job.job_url)}
                                        onChange={() => toggleSelect(job.job_url)}
                                    />
                                </td>

                                {ALL_COLUMNS.map(col => {
                                    if (!col.isFixed && !visibleColumns.has(col.id)) return null;

                                    /* Sticky Logic for Cells */
                                    let stickyClass = '';
                                    if (col.id === 'job_title') {
                                        stickyClass = 'sticky left-[60px] z-10 bg-white group-hover:bg-blue-50/50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]';
                                    } else if (col.id === 'company_name') {
                                        stickyClass = 'sticky left-[260px] z-10 bg-white group-hover:bg-blue-50/50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]';
                                    } else if (col.id === 'action') {
                                        stickyClass = 'sticky right-0 z-10 bg-white group-hover:bg-blue-50/50 shadow-[-1px_0_0_0_rgba(0,0,0,0.05)]';
                                    }

                                    return (
                                        <td key={col.id} className={`px-4 py-3 ${stickyClass}`} style={{ minWidth: col.width, maxWidth: col.width, width: col.width }}>
                                            {renderCell(col.id, job)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {filteredJobs.length === 0 && (
                            <tr>
                                <td colSpan={12}>
                                    <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                            <Briefcase size={24} />
                                        </div>
                                        <p className="font-medium text-gray-600">暂无数据</p>
                                        <p className="text-sm mt-1">
                                            {jobs.length > 0 ? "没有符合当前筛选条件的数据" : "请在左侧提交链接开始采集"}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Portal Tooltip */}
            {activeTooltip && createPortal(
                <div
                    className="fixed z-[9999] bg-white text-gray-700 text-xs rounded-lg shadow-xl border border-gray-100 p-3 max-w-sm break-words leading-relaxed whitespace-pre-wrap pointer-events-auto animate-in fade-in duration-200"
                    style={{
                        top: activeTooltip.y + 4,
                        left: Math.min(activeTooltip.x, window.innerWidth - 300),
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}
                    onMouseEnter={() => {
                        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                    }}
                    onMouseLeave={handleTooltipLeave}
                >
                    {activeTooltip.content}
                    {/* Small arrow pointing up */}
                    <div className="absolute bottom-full left-4 border-4 border-transparent border-b-white"></div>
                </div>,
                document.body
            )}
        </div >
    );
};
