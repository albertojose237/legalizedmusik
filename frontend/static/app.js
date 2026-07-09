const filesList = document.getElementById("filesList");
const refreshButton = document.getElementById("refreshButton");
const installCard = document.getElementById("installCard");
const installButton = document.getElementById("installButton");
const dismissInstall = document.getElementById("dismissInstall");
let deferredPrompt = null;

function renderFiles(files) {
  if (!files || !files.length) {
    filesList.innerHTML = "<p>Nenhum arquivo encontrado.</p>";
    return;
  }

  filesList.innerHTML = files
    .map(
      (file) => `
    <div class="file-item">
      <strong>${file}</strong>
    </div>
  `,
    )
    .join("");
}

async function loadFiles() {
  try {
    const response = await fetch("/api/files");
    const json = await response.json();
    renderFiles(json.files || []);
  } catch (error) {
    filesList.innerHTML =
      "<p>Erro ao carregar arquivos. Verifique se o servidor está ativo.</p>";
  }
}

refreshButton?.addEventListener("click", loadFiles);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installCard.classList.remove("hidden");
});

installButton?.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const choiceResult = await deferredPrompt.userChoice;
  if (choiceResult.outcome === "accepted") {
    installCard.classList.add("hidden");
  }
  deferredPrompt = null;
});

dismissInstall?.addEventListener("click", () => {
  installCard.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/static/service-worker.js");
    } catch (error) {
      console.warn("Service worker registration failed:", error);
    }
  });
}

loadFiles();

// Upload logic
const uploadInput = document.getElementById("uploadFileInput");
const uploadBtn = document.getElementById("uploadFileBtn");

uploadBtn?.addEventListener("click", async () => {
  const file = uploadInput?.files?.[0];
  if (!file) return alert("Selecione um arquivo para enviar.");
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch("/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) {
      alert("Arquivo enviado: " + json.filename);
      loadFiles();
    } else {
      alert("Erro no upload: " + (json.error || res.status));
    }
  } catch (err) {
    alert("Falha ao enviar: " + err.message);
  }
});

// MediaRecorder-based recording (works while PWA is open and in foreground)
const recordStartBtn = document.getElementById("recordStartBtn");
const recordStopBtn = document.getElementById("recordStopBtn");
const recordStatus = document.getElementById("recordStatus");

let mediaRecorder = null;
let recordedChunks = [];

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      const filename = `record_${Date.now()}.webm`;
      const fd = new FormData();
      fd.append("file", blob, filename);
      recordStatus.textContent = "Enviando...";
      try {
        const res = await fetch("/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (res.ok) {
          recordStatus.textContent = "Enviado: " + json.filename;
          loadFiles();
        } else {
          recordStatus.textContent = "Erro no envio";
        }
      } catch (err) {
        recordStatus.textContent = "Falha no envio";
      }
      // stop all tracks
      stream.getTracks().forEach((t) => t.stop());
      recordStartBtn.classList.remove("hidden");
      recordStopBtn.classList.add("hidden");
    };
    mediaRecorder.start();
    recordStatus.textContent = "Gravando...";
    recordStartBtn.classList.add("hidden");
    recordStopBtn.classList.remove("hidden");
  } catch (err) {
    console.warn("Falha ao acessar microfone:", err);
    recordStatus.textContent = "Permissão negada ou microfone indisponível";
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

recordStartBtn?.addEventListener("click", startRecording);
recordStopBtn?.addEventListener("click", stopRecording);

// Prompt for microphone permission on first load (user must interact on many browsers)
window.addEventListener("load", async () => {
  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: "microphone" });
      if (status.state === "granted") {
        recordStatus.textContent = "Microfone autorizado";
      } else if (status.state === "denied") {
        recordStatus.textContent = "Microfone negado";
      } else {
        recordStatus.textContent =
          "Clique em Iniciar gravação para autorizar microfone";
      }
    } catch (e) {
      // ignore
    }
  }
});
