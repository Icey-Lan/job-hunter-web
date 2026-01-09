"""
Track Manager - 岗位追踪管理模块
负责 tracked_jobs.json 的读写和业务逻辑
"""
import json
import re
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

TRACKED_JOBS_FILE = os.path.join(os.path.dirname(__file__), '..', 'tracked_jobs.json')

class TrackStatus(str, Enum):
    PENDING = "待投递"
    APPLIED = "已投递"
    INTERVIEW_1 = "一面"
    INTERVIEW_2 = "二面"
    INTERVIEW_3 = "三面"
    WAITING = "待开奖"
    OFFER = "Offer"
    REJECTED = "拒绝"
    WITHDRAWN = "放弃"

class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# 临时存储已删除的项（用于撤销）
_deleted_items: Dict[str, Dict[str, Any]] = {}

def extract_job_id(job_url: str) -> str:
    """从 Boss 直聘 URL 中提取 job_id"""
    # URL 格式: https://www.zhipin.com/job_detail/xxxxx.html
    # 或: https://www.zhipin.com/web/geek/job?jid=xxxxx
    match = re.search(r'job_detail/([^.]+)\.html', job_url)
    if match:
        return match.group(1)
    match = re.search(r'jid=([^&]+)', job_url)
    if match:
        return match.group(1)
    # 如果无法提取，使用 URL 的 hash 作为 ID
    return str(hash(job_url))

def load_tracked_jobs() -> List[Dict[str, Any]]:
    """加载追踪列表"""
    if not os.path.exists(TRACKED_JOBS_FILE):
        return []
    try:
        with open(TRACKED_JOBS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []

def save_tracked_jobs(jobs: List[Dict[str, Any]]) -> None:
    """保存追踪列表"""
    with open(TRACKED_JOBS_FILE, 'w', encoding='utf-8') as f:
        json.dump(jobs, f, ensure_ascii=False, indent=2)

def add_to_track(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    添加岗位到追踪列表
    job_data 应包含: job_url, job_title, company_name
    返回新创建的追踪记录
    """
    jobs = load_tracked_jobs()
    job_id = extract_job_id(job_data['job_url'])
    
    # 检查是否已存在
    for job in jobs:
        if job.get('job_id') == job_id:
            raise ValueError(f"岗位已在追踪列表中: {job_data.get('job_title', job_id)}")
    
    # 创建追踪记录
    tracked_job = {
        'job_id': job_id,
        'job_url': job_data['job_url'],
        'job_title': job_data.get('job_title', ''),
        'company_name': job_data.get('company_name', ''),
        
        # 追踪专有字段
        'track_status': TrackStatus.PENDING.value,
        'priority': Priority.MEDIUM.value,
        'added_at': datetime.now().isoformat(),
        'applied_at': None,
        'interview_at': None,
        'notes': '',
        
        # 分析型标签（预留）
        'analysis_tags': {
            'risk_level': None,
            'match_score': None
        }
    }
    
    jobs.append(tracked_job)
    save_tracked_jobs(jobs)
    return tracked_job

def update_track(job_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    更新追踪记录
    updates 可包含: track_status, priority, applied_at, interview_at, notes
    """
    jobs = load_tracked_jobs()
    
    for job in jobs:
        if job.get('job_id') == job_id:
            # 只允许更新特定字段
            allowed_fields = ['track_status', 'priority', 'applied_at', 'interview_at', 'notes']
            for field in allowed_fields:
                if field in updates:
                    job[field] = updates[field]
            save_tracked_jobs(jobs)
            return job
    
    return None

def delete_from_track(job_id: str) -> bool:
    """
    从追踪列表删除（支持 30s 撤销）
    返回是否删除成功
    """
    global _deleted_items
    jobs = load_tracked_jobs()
    
    for i, job in enumerate(jobs):
        if job.get('job_id') == job_id:
            deleted_job = jobs.pop(i)
            _deleted_items[job_id] = {
                'job': deleted_job,
                'deleted_at': datetime.now().isoformat()
            }
            save_tracked_jobs(jobs)
            return True
    
    return False

def undo_delete(job_id: str) -> Optional[Dict[str, Any]]:
    """
    撤销删除（30s 内有效）
    返回恢复的记录，如果超时或不存在则返回 None
    """
    global _deleted_items
    
    if job_id not in _deleted_items:
        return None
    
    deleted_info = _deleted_items[job_id]
    deleted_at = datetime.fromisoformat(deleted_info['deleted_at'])
    
    # 检查是否在 30s 内
    if (datetime.now() - deleted_at).total_seconds() > 30:
        del _deleted_items[job_id]
        return None
    
    # 恢复记录
    job = deleted_info['job']
    jobs = load_tracked_jobs()
    jobs.append(job)
    save_tracked_jobs(jobs)
    
    del _deleted_items[job_id]
    return job

def get_all_tracked_jobs() -> List[Dict[str, Any]]:
    """获取所有追踪记录"""
    return load_tracked_jobs()
