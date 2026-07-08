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
