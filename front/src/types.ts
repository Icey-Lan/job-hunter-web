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
