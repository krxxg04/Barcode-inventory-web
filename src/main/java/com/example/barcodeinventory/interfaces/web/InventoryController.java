package com.example.barcodeinventory.interfaces.web;

import com.example.barcodeinventory.application.service.InventoryService;
import com.example.barcodeinventory.domain.model.InventoryItem;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public List<InventoryItem> getInventory() {
        return inventoryService.getInventory();
    }

    @PostMapping("/sample")
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryItem createSample(@RequestBody SampleInventoryRequest request) {
        return inventoryService.registerManualSample(request.code());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearInventory() {
        inventoryService.clearInventory();
    }

    public record SampleInventoryRequest(String code) {
    }
}
