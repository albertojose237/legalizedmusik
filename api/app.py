from flask import Flask, render_template, jsonify, request, send_from_directory
import os
import datetime
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_DIR = os.path.join(BASE_DIR, "frontend", "templates")
STATIC_DIR = os.path.join(BASE_DIR, "frontend", "static")

app = Flask(
    __name__,
    static_folder=STATIC_DIR,
    template_folder=TEMPLATE_DIR,
)

DATA_FOLDER = os.getenv("DATA_FOLDER", "/tmp/data")
try:
    os.makedirs(DATA_FOLDER, exist_ok=True)
except OSError:
    DATA_FOLDER = "/tmp"

# Uploads folder (for files sent from the PWA/mobile)
UPLOAD_FOLDER = os.path.join(DATA_FOLDER, "uploads")
try:
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
except OSError:
    UPLOAD_FOLDER = DATA_FOLDER

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/files")
def api_files():
    try:
        home_dir = os.path.expanduser("~")
        mk_dir = os.path.join(home_dir, "MK")
        if os.path.isdir(mk_dir):
            arquivos = [f for f in os.listdir(mk_dir) if f.endswith((".mp3", ".txt"))]
        else:
            arquivos = []
    except OSError:
        arquivos = []
    return jsonify({"files": sorted(arquivos, reverse=True)})

@app.route("/add_task", methods=["POST"])
def add_task():
    task = request.json.get("task")
    if task:
        with open(os.path.join(DATA_FOLDER, "tasks.txt"), "a", encoding="utf-8") as f:
            f.write(f"[{datetime.datetime.now().strftime('%H:%M')}] {task}\n")
    return jsonify({"status": "ok"})


@app.route('/upload', methods=['POST'])
def upload_file():
    """Recebe um arquivo enviado pelo frontend (ex: gravação) e salva no servidor."""
    if 'file' not in request.files:
        return jsonify({"error": "no file provided"}), 400
    f = request.files['file']
    if f.filename == '':
        return jsonify({"error": "empty filename"}), 400
    filename = secure_filename(f.filename)
    dest = os.path.join(UPLOAD_FOLDER, filename)
    try:
        f.save(dest)
    except OSError:
        return jsonify({"error": "failed to save file"}), 500
    return jsonify({"status": "ok", "filename": filename})

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
