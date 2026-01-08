import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { TaskStatus } from '../types';

import { FailedTasksModal } from './FailedTasksModal';

export const StatusDashboard: React.FC = () => {
    const [status, setStatus] = useState<TaskStatus | null>(null);
    const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await axios.get('/api/tasks/status');
            setStatus(res.data);
        } catch (error) {
            console.error("Failed to fetch status", error);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!status) return <div className="p-4 text-gray-500">Loading status...</div>;

    const cards = [
        { label: '队列中 (Queued)', value: status.queue_length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100/50', border: 'border-amber-200' },
        { label: '进行中 (Running)', value: status.active_task ? 1 : 0, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100/50', border: 'border-blue-200' },
        { label: '已完成 (Success)', value: status.completed_count, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100/50', border: 'border-emerald-200' },
        {
            label: '失败 (Failed)',
            value: status.failed_count,
            icon: XCircle,
            color: 'text-rose-600',
            bg: 'bg-rose-100/50',
            border: 'border-rose-200',
            onClick: () => setIsRetryModalOpen(true),
            cursor: 'cursor-pointer hover:bg-rose-50'
        },
    ];

    return (
        <>
            <div className="grid grid-cols-2 gap-4 h-full">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        onClick={card.onClick}
                        className={`glass-card p-5 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 
                            ${card.border} border-l-4 ${card.cursor || 'cursor-default'}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className={`p-2 rounded-lg ${card.bg}`}>
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                            </div>
                            {card.value > 0 && (
                                <span className="flex h-2 w-2 relative">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${card.color.replace('text', 'bg')}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${card.color.replace('text', 'bg')}`}></span>
                                </span>
                            )}
                        </div>

                        <div className="mt-4">
                            <p className={`text-3xl font-bold tracking-tight text-gray-900 group-hover:scale-105 transition-transform origin-left`}>
                                {card.value}
                            </p>
                            <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">{card.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <FailedTasksModal
                isOpen={isRetryModalOpen}
                onClose={() => setIsRetryModalOpen(false)}
                onRetrySuccess={fetchStatus}
            />
        </>
    );
};
