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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
