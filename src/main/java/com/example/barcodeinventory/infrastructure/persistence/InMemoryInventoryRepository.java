package com.example.barcodeinventory.infrastructure.persistence;

import com.example.barcodeinventory.domain.model.InventoryItem;
import com.example.barcodeinventory.domain.repository.InventoryRepository;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Repository
public class InMemoryInventoryRepository implements InventoryRepository {

    private final List<InventoryItem> storage = new CopyOnWriteArrayList<>();

    @Override
    public List<InventoryItem> findAll() {
        return new ArrayList<>(storage);
    }

    @Override
    public InventoryItem save(InventoryItem item) {
        storage.add(item);
        return item;
    }

    @Override
    public void deleteAll() {
        storage.clear();
    }
}
