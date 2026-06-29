package com.example.barcodeinventory.application.service;

import com.example.barcodeinventory.domain.model.InventoryItem;
import com.example.barcodeinventory.domain.repository.InventoryRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    public InventoryService(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    public List<InventoryItem> getInventory() {
        return inventoryRepository.findAll();
    }

    public InventoryItem registerManualSample(String code) {
        InventoryItem item = new InventoryItem(code, Instant.now());
        return inventoryRepository.save(item);
    }

    public void clearInventory() {
        inventoryRepository.deleteAll();
    }
}
