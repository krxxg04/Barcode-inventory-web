const STORAGE_KEY = "inventario";

const startScanButton = document.getElementById("start-scan-btn");
const scanImageButton = document.getElementById("scan-image-btn");
const saveItemButton = document.getElementById("save-item-btn");
const clearInventoryButton = document.getElementById("clear-inventory-btn");
const detectedCodeElement = document.getElementById("detected-code");
const inventoryBody = document.getElementById("inventory-body");
const inventoryCount = document.getElementById("inventory-count");
const cameraStatus = document.getElementById("camera-status");
const videoElement = document.getElementById("scanner-preview");
const imageInput = document.getElementById("image-input");

const codeReader = new ZXingBrowser.BrowserMultiFormatReader();

let lastDetectedCode = "";
let controls = null;
let isScanning = false;
let scanSessionDetected = false;

function getInventory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveInventory(inventory) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

function formatDate(isoDate) {
    return new Date(isoDate).toLocaleString("es-PE", {
        dateStyle: "short",
        timeStyle: "medium"
    });
}

function renderInventory() {
    const inventory = getInventory();
    inventoryCount.textContent = inventory.length;

    if (inventory.length === 0) {
        inventoryBody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-state">Todavia no hay items guardados.</td>
            </tr>
        `;
        return;
    }

    inventoryBody.innerHTML = inventory
        .map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.codigo}</td>
                <td>${formatDate(item.fecha)}</td>
            </tr>
        `)
        .join("");
}

function setDetectedCode(code) {
    lastDetectedCode = code;
    detectedCodeElement.textContent = code || "Aun no se detecta ningun codigo";
    saveItemButton.disabled = !code;
}

function updateCameraStatus(message) {
    cameraStatus.textContent = message;
}

function updateScanButtonLabel() {
    startScanButton.textContent = isScanning ? "Reiniciar escaneo" : "Iniciar escaneo";
}

function stopScanning(resetStatus = false) {
    if (controls) {
        controls.stop();
        controls = null;
    }

    codeReader.reset();
    isScanning = false;
    updateScanButtonLabel();

    if (resetStatus) {
        updateCameraStatus("Camara inactiva.");
    }
}

function buildVideoConstraints() {
    return [
        {
            video: {
                facingMode: { exact: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        },
        {
            video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        },
        {
            video: true
        }
    ];
}

function normalizeCameraError(error) {
    if (!window.isSecureContext) {
        return "La camara solo funciona en HTTPS o localhost.";
    }

    switch (error?.name) {
        case "NotAllowedError":
        case "SecurityError":
            return "Permiso de camara bloqueado. Habilitalo en el navegador y vuelve a intentar.";
        case "NotFoundError":
            return "No se encontro una camara disponible para este dispositivo.";
        case "NotReadableError":
            return "La camara esta en uso por otra app o el navegador no pudo abrirla.";
        case "OverconstrainedError":
            return "La camara no soporta la configuracion solicitada. Probando una opcion mas simple ayuda.";
        default:
            return error?.message || "No fue posible iniciar la camara.";
    }
}

async function beginDecodeWithConstraints() {
    const constraintsList = buildVideoConstraints();
    let lastError = null;

    for (const constraints of constraintsList) {
        try {
            controls = await codeReader.decodeFromConstraints(constraints, videoElement, handleScanResult);
            return;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("No fue posible iniciar la camara.");
}

function handleScanResult(result, error) {
    if (result && !scanSessionDetected) {
        scanSessionDetected = true;
        setDetectedCode(result.getText());
        updateCameraStatus("Codigo detectado. Revisa el valor y guardalo.");
        stopScanning(false);

        if (navigator.vibrate) {
            navigator.vibrate(120);
        }
    }

    if (error && error.name !== "NotFoundException") {
        console.error(error);
    }
}

async function startScanning() {
    stopScanning(false);
    startScanButton.disabled = true;
    scanImageButton.disabled = true;
    updateCameraStatus("Solicitando permiso de camara...");
    setDetectedCode("");
    scanSessionDetected = false;

    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Este navegador no soporta acceso a la camara.");
        }

        await beginDecodeWithConstraints();
        isScanning = true;
        updateScanButtonLabel();
        updateCameraStatus("Camara activa. Apunta al codigo de barras.");
    } catch (error) {
        console.error(error);
        updateCameraStatus(normalizeCameraError(error));
        stopScanning(false);
    } finally {
        startScanButton.disabled = false;
        scanImageButton.disabled = false;
    }
}

function saveCurrentCode() {
    if (!lastDetectedCode) {
        return;
    }

    const inventory = getInventory();

    inventory.unshift({
        codigo: lastDetectedCode,
        fecha: new Date().toISOString()
    });

    saveInventory(inventory);
    renderInventory();
    updateCameraStatus("Codigo guardado en inventario local.");
    setDetectedCode("");
    startScanButton.focus();
}

function clearInventory() {
    localStorage.removeItem(STORAGE_KEY);
    renderInventory();
    updateCameraStatus("Inventario local limpiado.");
}

async function scanFromImageFile(file) {
    const imageUrl = URL.createObjectURL(file);

    startScanButton.disabled = true;
    scanImageButton.disabled = true;
    updateCameraStatus("Analizando imagen...");
    setDetectedCode("");

    try {
        const result = await codeReader.decodeFromImageUrl(imageUrl);
        setDetectedCode(result.getText());
        updateCameraStatus("Codigo detectado desde la imagen. Listo para guardar.");
    } catch (error) {
        console.error(error);
        updateCameraStatus("No se detecto un codigo valido en la imagen.");
    } finally {
        URL.revokeObjectURL(imageUrl);
        imageInput.value = "";
        startScanButton.disabled = false;
        scanImageButton.disabled = false;
    }
}

startScanButton.addEventListener("click", startScanning);
saveItemButton.addEventListener("click", saveCurrentCode);
clearInventoryButton.addEventListener("click", clearInventory);
scanImageButton.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
        return;
    }

    stopScanning(false);
    await scanFromImageFile(file);
});

window.addEventListener("beforeunload", () => {
    stopScanning(false);
});

updateScanButtonLabel();
renderInventory();
