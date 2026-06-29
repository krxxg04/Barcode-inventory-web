package com.example.barcodeinventory.domain.model;

import java.time.Instant;

public record InventoryItem(String code, Instant scannedAt) {
}
