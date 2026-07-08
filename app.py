from flask import Flask, render_template, jsonify, request, send_from_directory
import os
import datetime

app = Flask(
    __name__,
    static_folder="frontend/static",
    template_folder="frontend/templates",
)

DATA_FOLDER = "data"
os.makedirs(DATA_FOLDER, exist_ok=True)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/files")
def api_files():
    mk_dir = os.path.join(os.path.expanduser("~"), "MK")
    os.makedirs(mk_dir, exist_ok=True)
    arquivos = [f for f in os.listdir(mk_dir) if f.endswith((".mp3", ".txt"))]
    return jsonify({"files": sorted(arquivos, reverse=True)})

@app.route("/add_task", methods=["POST"])
def add_task():
    task = request.json.get("task")
    if task:
        with open(os.path.join(DATA_FOLDER, "tasks.txt"), "a", encoding="utf-8") as f:
            f.write(f"[{datetime.datetime.now().strftime('%H:%M')}] {task}\n")
    return jsonify({"status": "ok"})

@app.route("/tasks")
def get_tasks():
    try:
        with open(os.path.join(DATA_FOLDER, "tasks.txt"), "r", encoding="utf-8") as f:
            tasks = f.readlines()[-20:]
        return jsonify([t.strip() for t in tasks])
    except FileNotFoundError:
        return jsonify([])

@app.route('/manifest.json')
def manifest():
    return send_from_directory(app.static_folder, 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory(app.static_folder, 'service-worker.js')

if __name__ == "__main__":
    print("🚀 Legalized Musik Project iniciado!")
    print("Acesse: http://127.0.0.1:8080")
    app.run(host="0.0.0.0", port=8080)
