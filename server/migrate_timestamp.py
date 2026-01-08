import json
import os
from datetime import datetime

DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../job_details.json"))

def migrate():
    if not os.path.exists(DATA_FILE):
        print("No data file found.")
        return

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print("Invalid JSON.")
            return

    updated_count = 0
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    for job in data:
        if 'scraped_at' not in job:
            job['scraped_at'] = now_str
            updated_count += 1
    
    if updated_count > 0:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Successfully backfilled timestamp to {updated_count} records.")
    else:
        print("No records needed update.")

if __name__ == "__main__":
    migrate()
