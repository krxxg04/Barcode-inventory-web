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

const BARCODE_FORMATS = [
    "ean_13",
    "ean_8",
    "upc_a",
    "upc_e",
    "code_128",
    "code_39",
    "codabar",
    "itf",
    "qr_code"
];

let lastDetectedCode = "";
let controls = null;
let previewStream = null;
let isScanning = false;
let scanSessionDetected = false;
let scanFrameId = null;
let codeReader = null;
let barcodeDetector = null;

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
    if (scanFrameId) {
        cancelAnimationFrame(scanFrameId);
        scanFrameId = null;
    }

    try {
        if (controls && typeof controls.stop === "function") {
            controls.stop();
        }
    } catch (error) {
        console.warn("No se pudo detener el control de escaneo.", error);
    } finally {
        controls = null;
    }

    if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
        previewStream = null;
    }

    if (videoElement.srcObject) {
        videoElement.srcObject = null;
    }

    if (codeReader && typeof codeReader.reset === "function") {
        try {
            codeReader.reset();
        } catch (error) {
            console.warn("No se pudo reiniciar el lector.", error);
        }
    }

    isScanning = false;
    updateScanButtonLabel();

    if (resetStatus) {
        updateCameraStatus("Camara inactiva.");
    }
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

async function getNativeDetector() {
    if (!("BarcodeDetector" in window)) {
        return null;
    }

    if (barcodeDetector) {
        return barcodeDetector;
    }

    if (typeof BarcodeDetector.getSupportedFormats === "function") {
        const supportedFormats = await BarcodeDetector.getSupportedFormats();
        const formats = BARCODE_FORMATS.filter((format) => supportedFormats.includes(format));
        barcodeDetector = new BarcodeDetector({
            formats: formats.length > 0 ? formats : undefined
        });
        return barcodeDetector;
    }

    barcodeDetector = new BarcodeDetector();
    return barcodeDetector;
}

function getZxingReader() {
    if (!window.ZXingBrowser) {
        return null;
    }

    if (codeReader) {
        return codeReader;
    }

    codeReader = ZXingBrowser.BrowserMultiFormatOneDReader
        ? new ZXingBrowser.BrowserMultiFormatOneDReader()
        : new ZXingBrowser.BrowserMultiFormatReader();

    return codeReader;
}

async function requestPreviewStream() {
    const attempts = [
        {
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        },
        {
            video: {
                facingMode: "environment"
            },
            audio: false
        },
        {
            video: true,
            audio: false
        }
    ];

    let lastError = null;

    for (const constraints of attempts) {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("No fue posible abrir la camara.");
}

async function detectFromVideoWithNativeDetector() {
    const detector = await getNativeDetector();

    if (!detector) {
        return false;
    }

    const scan = async () => {
        if (!previewStream || scanSessionDetected) {
            return;
        }

        try {
            if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                const barcodes = await detector.detect(videoElement);

                if (barcodes.length > 0) {
                    const rawValue = barcodes[0].rawValue || "";

                    if (rawValue) {
                        handleDetectedCode(rawValue);
                        return;
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }

        scanFrameId = requestAnimationFrame(scan);
    };

    scanFrameId = requestAnimationFrame(scan);
    return true;
}

function handleDetectedCode(code) {
    if (!code || scanSessionDetected) {
        return;
    }

    scanSessionDetected = true;
    setDetectedCode(code);
    updateCameraStatus("Codigo detectado. Revisa el valor y guardalo.");
    stopScanning(false);

    if (navigator.vibrate) {
        navigator.vibrate(120);
    }
}

async function startDecoder() {
    previewStream = await requestPreviewStream();
    videoElement.srcObject = previewStream;

    try {
        await videoElement.play();
    } catch (error) {
        console.warn("No se pudo reproducir el preview automaticamente.", error);
    }

    const nativeStarted = await detectFromVideoWithNativeDetector();

    if (nativeStarted) {
        return;
    }

    const reader = getZxingReader();

    if (!reader) {
        throw new Error("No se pudo cargar el motor de escaneo. Recarga la pagina e intenta otra vez.");
    }

    if (typeof reader.decodeFromStream === "function") {
        controls = await reader.decodeFromStream(previewStream, videoElement, handleScanResult);
        return;
    }

    controls = await reader.decodeFromVideoElement(videoElement, handleScanResult);
}

function handleScanResult(result, error) {
    if (result) {
        const text = typeof result.getText === "function" ? result.getText() : result.text;
        handleDetectedCode(text);
    }

    if (error && error.name !== "NotFoundException") {
        console.error(error);
    }
}

async function startScanning() {
    try {
        stopScanning(false);
        startScanButton.disabled = true;
        scanImageButton.disabled = true;
        updateCameraStatus("Solicitando permiso de camara...");
        setDetectedCode("");
        scanSessionDetected = false;

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Este navegador no soporta acceso a la camara.");
        }

        await startDecoder();
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
    startScanButton.disabled = true;
    scanImageButton.disabled = true;
    updateCameraStatus("Analizando imagen...");
    setDetectedCode("");

    try {
        const result = await decodeImageFile(file);
        setDetectedCode(result.getText());
        updateCameraStatus("Codigo detectado desde la imagen. Listo para guardar.");
    } catch (error) {
        console.error(error);
        updateCameraStatus("No se detecto un codigo valido en la imagen.");
    } finally {
        imageInput.value = "";
        startScanButton.disabled = false;
        scanImageButton.disabled = false;
    }
}

function decodeImageFile(file) {
    return new Promise((resolve, reject) => {
        const imageUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = async () => {
            try {
                const detector = await getNativeDetector();

                if (detector) {
                    const barcodes = await detector.detect(image);

                    if (barcodes.length > 0 && barcodes[0].rawValue) {
                        resolve({
                            getText: () => barcodes[0].rawValue
                        });
                        return;
                    }
                }

                const reader = getZxingReader();

                if (!reader) {
                    throw new Error("No se pudo cargar el motor de escaneo para imagen.");
                }

                const result = await reader.decodeFromImageElement(image);
                resolve(result);
            } catch (error) {
                reject(error);
            } finally {
                URL.revokeObjectURL(imageUrl);
            }
        };

        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error("No se pudo cargar la imagen seleccionada."));
        };

        image.src = imageUrl;
    });
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
