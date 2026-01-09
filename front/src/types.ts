export interface Job {
    job_title: string;
    salary: string;
    company_name: string;
    company_industry: string;
    company_size: string;
    company_financing: string;
    location: string;
    work_address: string;
    experience_required: string;
    education_required: string;
    job_tags: string[];
    job_description: string;
    benefits: string[];
    recruiter: {
        name: string;
        title: string;
        status: string;
    };
    job_url: string;
    scraped_at?: string;
}

export interface TaskStatus {
    queue_length: number;
    active_task: string | null;
    completed_count: number;
    failed_count: number;
    total_tasks: number;
}

export interface Task {
    id: string;
    url: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
    created_at: string;
    updated_at: string;
}

// ==================== Track Types ====================

export const TRACK_STATUSES = [
    '待投递', '已投递', '一面', '二面', '三面', '待开奖', 'Offer', '拒绝', '放弃'
] as const;

export type TrackStatus = typeof TRACK_STATUSES[number];

export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = typeof PRIORITIES[number];

export interface TrackedJob {
    job_id: string;
    job_url: string;
    job_title: string;
    company_name: string;

    // 追踪专有字段
    track_status: TrackStatus;
    priority: Priority;
    added_at: string;
    applied_at: string | null;
    interview_at: string | null;
    notes: string;

    // 分析型标签（预留）
    analysis_tags: {
        risk_level: string | null;
        match_score: number | null;
    };
}

