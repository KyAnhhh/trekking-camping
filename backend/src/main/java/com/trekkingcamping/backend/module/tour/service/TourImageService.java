package com.trekkingcamping.backend.module.tour.service;

import com.trekkingcamping.backend.module.tour.entity.TourImage;
import com.trekkingcamping.backend.module.tour.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.*;

@Service
public class TourImageService {
    public record ImageDto(Long id, String imageUrl, boolean isCover) {
        static ImageDto from(TourImage image) { return new ImageDto(image.getId(), image.getImageUrl(), Boolean.TRUE.equals(image.getIsCover())); }
    }
    private final TourImageRepository images;
    private final TourRepository tours;
    private final TourImageStorage storage;
    public TourImageService(TourImageRepository images, TourRepository tours, TourImageStorage storage) {
        this.images = images; this.tours = tours; this.storage = storage;
    }
    @Transactional(readOnly = true)
    public List<ImageDto> list(Long tourId) {
        var tour = tours.findById(tourId).filter(t -> Boolean.TRUE.equals(t.getIsActive())).orElseThrow(this::notFound);
        return images.findByTourIdOrderByIsCoverDescIdAsc(tour.getId()).stream().map(ImageDto::from).toList();
    }
    @Transactional(rollbackFor = Exception.class)
    public ImageDto upload(Long tourId, MultipartFile file) throws IOException {
        var tour = tours.findByIdForUpdate(tourId).orElseThrow(this::notFound);
        var existing = images.findByTourIdOrderByIsCoverDescIdAsc(tourId);
        if (existing.size() >= 20) throw new IllegalArgumentException("Mỗi tour tối đa 20 ảnh.");
        String url = storage.save(file);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) { if (status != STATUS_COMMITTED) storage.remove(url); }
        });
        var image = new TourImage(); image.setTour(tour); image.setImageUrl(url); image.setIsCover(existing.isEmpty());
        return ImageDto.from(images.save(image));
    }
    @Transactional
    public void cover(Long tourId, Long imageId) {
        tours.findByIdForUpdate(tourId).orElseThrow(this::notFound);
        var all = images.findByTourIdOrderByIsCoverDescIdAsc(tourId);
        if (all.stream().noneMatch(i -> Objects.equals(i.getId(), imageId))) throw notFound();
        all.forEach(i -> i.setIsCover(Objects.equals(i.getId(), imageId))); images.saveAll(all);
    }
    @Transactional
    public void delete(Long tourId, Long imageId) {
        tours.findByIdForUpdate(tourId).orElseThrow(this::notFound);
        var all = images.findByTourIdOrderByIsCoverDescIdAsc(tourId);
        var image = all.stream().filter(i -> Objects.equals(i.getId(), imageId)).findFirst().orElseThrow(this::notFound);
        images.delete(image);
        if (Boolean.TRUE.equals(image.getIsCover())) all.stream().filter(i -> !Objects.equals(i.getId(), imageId)).findFirst()
                .ifPresent(i -> { i.setIsCover(true); images.save(i); });
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { storage.remove(image.getImageUrl()); }
        });
    }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tour hoặc ảnh."); }
}
