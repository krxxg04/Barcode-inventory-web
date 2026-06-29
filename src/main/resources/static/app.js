const STORAGE_KEY = "inventario";

const startScanButton = document.getElementById("start-scan-btn");
const saveItemButton = document.getElementById("save-item-btn");
const clearInventoryButton = document.getElementById("clear-inventory-btn");
const detectedCodeElement = document.getElementById("detected-code");
const inventoryBody = document.getElementById("inventory-body");
const inventoryCount = document.getElementById("inventory-count");
const cameraStatus = document.getElementById("camera-status");
const videoElement = document.getElementById("scanner-preview");

const codeReader = new ZXingBrowser.BrowserMultiFormatReader();

let selectedDeviceId = null;
let lastDetectedCode = "";
let controls = null;

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

async function resolvePreferredDeviceId() {
    const devices = await ZXingBrowser.BrowserCodeReader.listVideoInputDevices();

    if (devices.length === 0) {
        throw new Error("No se encontro ninguna camara disponible.");
    }

    const rearCamera = devices.find((device) =>
        /back|rear|environment/gi.test(device.label)
    );

    return rearCamera?.deviceId || devices[0].deviceId;
}

async function startScanning() {
    startScanButton.disabled = true;
    updateCameraStatus("Solicitando permiso de camara...");
    setDetectedCode("");

    try {
        selectedDeviceId = await resolvePreferredDeviceId();
        controls = await codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, (result, error) => {
            if (result) {
                setDetectedCode(result.getText());
                updateCameraStatus("Codigo detectado. Listo para guardar.");
            }

            if (error && error.name !== "NotFoundException") {
                console.error(error);
            }
        });

        updateCameraStatus("Camara activa. Apunta al codigo de barras.");
    } catch (error) {
        console.error(error);
        updateCameraStatus(error.message || "No fue posible iniciar la camara.");
        startScanButton.disabled = false;
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
}

function clearInventory() {
    localStorage.removeItem(STORAGE_KEY);
    renderInventory();
    updateCameraStatus("Inventario local limpiado.");
}

startScanButton.addEventListener("click", startScanning);
saveItemButton.addEventListener("click", saveCurrentCode);
clearInventoryButton.addEventListener("click", clearInventory);

window.addEventListener("beforeunload", () => {
    if (controls) {
        controls.stop();
    }
    codeReader.reset();
});

renderInventory();
