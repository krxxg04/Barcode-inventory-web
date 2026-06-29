package com.example.barcodeinventory.domain.repository;

import com.example.barcodeinventory.domain.model.InventoryItem;

import java.util.List;

public interface InventoryRepository {

    List<InventoryItem> findAll();

    InventoryItem save(InventoryItem item);

    void deleteAll();
}
