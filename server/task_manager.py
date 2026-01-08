import asyncio
import json
import os
from typing import List, Optional, Dict
from datetime import datetime
from scraper import scraper

# Type definitions
class JobTask:
    def __init__(self, url: str):
        self.id = url # Use URL as ID for simplicity in deduplication
        self.url = url
        self.status = "pending" # pending, processing, completed, failed
        self.result = None
        self.error = None
        self.created_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()

class TaskManager:
    def __init__(self, data_file: str):
        self.queue = asyncio.Queue()
        self.tasks: Dict[str, JobTask] = {}
        self.data_file = data_file
        self.is_running = False

    def add_tasks(self, urls: List[str]):
        added_count = 0
        for url in urls:
            url = url.strip()
            if not url:
                continue
            # Simple deduplication: if pending or processing, don't add
            if url in self.tasks and self.tasks[url].status in ["pending", "processing"]:
                continue
            
            task = JobTask(url)
            self.tasks[url] = task
            self.queue.put_nowait(task)
            added_count += 1
            
        if not self.is_running and added_count > 0:
            asyncio.create_task(self.process_queue())
        
        return added_count

    async def process_queue(self):
        try:
            self.is_running = True
            print("Starting queue processor...")
            
            # Ensure browser is started
            try:
                await scraper.start_browser()
            except Exception as e:
                print(f"Failed to start browser: {e}")
                return # Exit if browser fails, finally block will reset is_running

            while not self.queue.empty():
                task: JobTask = await self.queue.get()
                
                try:
                    task.status = "processing"
                    task.updated_at = datetime.now().isoformat()
                    
                    print(f"Processing: {task.url}")
                    data = await scraper.scrape_job(task.url)
                    
                    task.status = "completed"
                    task.result = data
                    self.save_result_to_file(data)
                    
                except Exception as e:
                    task.status = "failed"
                    task.error = str(e)
                    print(f"Task failed: {e}")
                finally:
                    task.updated_at = datetime.now().isoformat()
                    self.queue.task_done()
                    
                    # Small delay between tasks to be safe
                    await asyncio.sleep(2) 

            print("Queue empty. Processor finished.")
            
        except Exception as e:
            print(f"Queue processor crashed: {e}")
        finally:
            self.is_running = False
            print("Queue processor stopped (is_running=False).")

    def save_result_to_file(self, data: dict):
        """Appends a new record to the JSON file, replacing any existing record with the same URL."""
        try:
            # Read existing
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    try:
                        current_data = json.load(f)
                    except json.JSONDecodeError:
                        current_data = []
            else:
                current_data = []

            # Remove existing record with the same URL (deduplication - keep only latest)
            new_url = data.get('job_url')
            if new_url:
                current_data = [job for job in current_data if job.get('job_url') != new_url]

            # Append the new (latest) result
            current_data.append(data)

            # Write back
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(current_data, f, ensure_ascii=False, indent=4)
                
        except Exception as e:
            print(f"Error saving data: {e}")

    def get_status_summary(self):
        summary = {
            "queue_length": self.queue.qsize(),
            "active_task": None, # Could enhance to show current url
            "completed_count": sum(1 for t in self.tasks.values() if t.status == "completed"),
            "failed_count": sum(1 for t in self.tasks.values() if t.status == "failed"),
            "total_tasks": len(self.tasks),
            "recent_logs": [] # Could add logs
        }
        return summary
    
    def get_all_jobs(self):
        """Reads the source of truth JSON file."""
        if os.path.exists(self.data_file):
             with open(self.data_file, 'r', encoding='utf-8') as f:
                    try:
                        return json.load(f)
                    except:
                        return []
        return []

    def delete_jobs(self, urls_to_delete: List[str]):
        """Deletes jobs matching the given URLs."""
        if not os.path.exists(self.data_file):
            return 0
        
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                current_data = json.load(f)
            
            # Simple filtering
            original_count = len(current_data)
            # Filter out jobs where job_url is in the deletion list
            new_data = [job for job in current_data if job.get('job_url') not in urls_to_delete]
            deleted_count = original_count - len(new_data)
            
            if deleted_count > 0:
                with open(self.data_file, 'w', encoding='utf-8') as f:
                    json.dump(new_data, f, ensure_ascii=False, indent=4)
            
            return deleted_count
        except Exception as e:
            print(f"Error deleting jobs: {e}")
            return 0
            
    def get_failed_tasks(self) -> List[dict]:
        """Returns a list of failed tasks."""
        return [task.__dict__ for task in self.tasks.values() if task.status == "failed"]

    def retry_tasks(self, urls: List[str]) -> int:
        """Resets status of specific failed tasks and re-queues them."""
        count = 0
        for url in urls:
            if url in self.tasks:
                task = self.tasks[url]
                if task.status == "failed":
                    task.status = "pending"
                    task.error = None
                    task.updated_at = datetime.now().isoformat()
                    self.queue.put_nowait(task) # Re-add to queue
                    count += 1
        
        # If queue processor stopped, restart it
        if not self.is_running and count > 0:
            asyncio.create_task(self.process_queue())
            
        return count

# Singleton
# We need to initialized it with the data file path from main.py, 
# but for now we can defer initialization or use a hardcoded path relative to this file?
# Better to let main.py initialize it.
