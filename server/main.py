import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import asyncio

# Initialize App
app = FastAPI(title="Job Hunter API")

# CORS (Allow Frontend to hit API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../job_details.json"))

from task_manager import TaskManager
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd
import io

@app.get("/")
def read_root():
    return {"message": "Job Hunter API is running", "data_file": DATA_FILE}

# Initialize TaskManager
# We use the absolute path to job_details.json
task_manager = TaskManager(DATA_FILE)

@app.on_event("startup")
async def startup_event():
    # Ensure data file exists or can be created
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            f.write('[]')

# Request Models
class TaskSubmit(BaseModel):
    urls: List[str]

@app.post("/api/tasks/submit")
async def submit_tasks(task_data: TaskSubmit):
    count = task_manager.add_tasks(task_data.urls)
    return {
        "message": f"Successfully added {count} tasks to queue", 
        "total_queued": task_manager.queue.qsize(),
        "status": "queued"
    }

@app.get("/api/tasks/status")
def get_status():
    return task_manager.get_status_summary()

@app.get("/api/jobs")
def get_jobs():
    return task_manager.get_all_jobs()

@app.get("/api/tasks/debug")
def get_debug_tasks():
    # Helper to serialize JobTask objects
    return [t.__dict__ for t in task_manager.tasks.values()]

class DeleteRequest(BaseModel):
    urls: List[str]

@app.get("/api/export")
def export_data(format: str = "json"):
    data = task_manager.get_all_jobs()
    
    if format == "json":
        return data
        
    elif format == "csv":
        df = pd.DataFrame(data)
        # Convert to CSV string first
        csv_content = df.to_csv(index=False)
        # Manually encode to bytes with BOM (key for Excel)
        csv_bytes = b'\xef\xbb\xbf' + csv_content.encode('utf-8')
        
        response = StreamingResponse(iter([csv_bytes]), media_type="text/csv; charset=utf-8")
        response.headers["Content-Disposition"] = "attachment; filename=job_details.csv"
        return response
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'json' or 'csv'.")

@app.post("/api/jobs/delete")
async def delete_jobs(request: DeleteRequest):
    count = task_manager.delete_jobs(request.urls)
    return {"deleted_count": count, "message": f"Successfully deleted {count} jobs"}

class RetryRequest(BaseModel):
    urls: List[str]

@app.get("/api/tasks/failed")
def get_failed_tasks():
    return task_manager.get_failed_tasks()

@app.post("/api/tasks/retry")
def retry_tasks(request: RetryRequest):
    count = task_manager.retry_tasks(request.urls)
    return {
        "retry_count": count, 
        "message": f"Successfully re-queued {count} failed tasks",
        "status": "queued"
    }

# ==================== Track API ====================
from track_manager import (
    get_all_tracked_jobs, 
    add_to_track, 
    update_track, 
    delete_from_track, 
    undo_delete,
    TrackStatus,
    Priority
)

class TrackAddRequest(BaseModel):
    job_url: str
    job_title: str
    company_name: str

class TrackUpdateRequest(BaseModel):
    job_id: str
    track_status: str = None
    priority: str = None
    applied_at: str = None
    interview_at: str = None
    notes: str = None

class TrackDeleteRequest(BaseModel):
    job_id: str

@app.get("/api/track/list")
def list_tracked_jobs():
    """获取所有追踪的岗位"""
    return get_all_tracked_jobs()

@app.post("/api/track/add")
def add_tracked_job(request: TrackAddRequest):
    """添加岗位到追踪列表"""
    try:
        job = add_to_track({
            "job_url": request.job_url,
            "job_title": request.job_title,
            "company_name": request.company_name
        })
        return {"success": True, "job": job}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/track/update")
def update_tracked_job(request: TrackUpdateRequest):
    """更新追踪状态/备注/时间"""
    updates = {}
    if request.track_status is not None:
        updates["track_status"] = request.track_status
    if request.priority is not None:
        updates["priority"] = request.priority
    if request.applied_at is not None:
        updates["applied_at"] = request.applied_at
    if request.interview_at is not None:
        updates["interview_at"] = request.interview_at
    if request.notes is not None:
        updates["notes"] = request.notes
    
    job = update_track(request.job_id, updates)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found in track list")
    return {"success": True, "job": job}

@app.delete("/api/track/delete")
def delete_tracked_job(request: TrackDeleteRequest):
    """从追踪列表移除"""
    success = delete_from_track(request.job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found in track list")
    return {"success": True, "message": "Job removed from track list", "can_undo": True}

@app.post("/api/track/undo")
def undo_delete_tracked_job(request: TrackDeleteRequest):
    """撤销删除（30s内有效）"""
    job = undo_delete(request.job_id)
    if job is None:
        raise HTTPException(status_code=400, detail="Cannot undo: timeout or job not found")
    return {"success": True, "job": job}

@app.get("/api/track/statuses")
def get_track_statuses():
    """获取所有可用的追踪状态"""
    return {
        "statuses": [s.value for s in TrackStatus],
        "priorities": [p.value for p in Priority]
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

