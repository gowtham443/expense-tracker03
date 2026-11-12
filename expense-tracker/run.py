import os
import sys
import webbrowser
import threading
import time

def open_browser():
    time.sleep(1.2)
    webbrowser.open("http://localhost:8000")

def main():
    print("=" * 60)
    print(" Starting ExpenseFlow - Personal Expense Tracker ")
    print("=" * 60)

    # Check if database exists, if not seed initial data
    if not os.path.exists("expenses.db"):
        print("[*] Initializing and seeding default categories & sample data...")
        try:
            from seed_data import seed
            seed()
        except Exception as e:
            print(f"[!] Note: Seed skipped or encountered: {e}")

    # Launch browser thread
    threading.Thread(target=open_browser, daemon=True).start()

    print("\n[+] Web App running at: http://localhost:8000")
    print("[+] Interactive API Docs at: http://localhost:8000/docs")
    print("[+] Press Ctrl+C in this terminal to stop the server.\n")

    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    main()
