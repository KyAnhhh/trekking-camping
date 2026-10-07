package com.trekkingcamping.backend.module.tour;

import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.tour.repository.*;
import com.trekkingcamping.backend.module.tour.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TourImageTest {
    @TempDir Path directory;
    MockMultipartFile png() throws Exception {
        var bytes = new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_ARGB), "png", bytes);
        return new MockMultipartFile("file", "../../outside.png", "image/png", bytes.toByteArray());
    }
    @Test void reencodesToJpegAndNeverUsesClientFilename() throws Exception {
        var storage = new TourImageStorage(directory.toString()); String url = storage.save(png());
        String name = url.substring(url.lastIndexOf('/') + 1);
        assertTrue(name.matches("[a-f0-9-]{36}\\.jpg")); assertTrue(storage.read(name).exists());
        assertNotNull(ImageIO.read(storage.read(name).getInputStream()));
        assertThrows(ResponseStatusException.class, () -> storage.read("../../outside.png"));
    }
    @Test void rejectsHtmlSvgDisguisedAsImageAndLargeFile() {
        var storage = new TourImageStorage(directory.toString());
        for (String content : new String[]{"<html>test</html>", "<svg><script>alert(1)</script></svg>"}) {
            assertThrows(IllegalArgumentException.class, () -> storage.save(new MockMultipartFile("file", "fake.jpg", "image/jpeg", content.getBytes())));
        }
        assertThrows(IllegalArgumentException.class, () -> storage.save(new MockMultipartFile("file", "huge.jpg", "image/jpeg", new byte[5 * 1024 * 1024 + 1])));
    }
    @Test void rollbackRemovesUploadedFileAndForeignImageCannotBecomeCover() throws Exception {
        var images = mock(TourImageRepository.class); var tours = mock(TourRepository.class);
        var storage = new TourImageStorage(directory.toString()); var service = new TourImageService(images, tours, storage);
        var tour = new Tour(); tour.setId(1L);
        when(tours.findByIdForUpdate(1L)).thenReturn(Optional.of(tour));
        when(images.findByTourIdOrderByIsCoverDescIdAsc(1L)).thenReturn(List.of());
        when(images.save(any())).thenAnswer(inv -> { TourImage image = inv.getArgument(0); image.setId(1L); return image; });
        TransactionSynchronizationManager.initSynchronization();
        try {
            var uploaded = service.upload(1L, png());
            assertTrue(uploaded.isCover()); String name = uploaded.imageUrl().substring(uploaded.imageUrl().lastIndexOf('/') + 1);
            assertTrue(storage.read(name).exists());
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
            assertThrows(ResponseStatusException.class, () -> storage.read(name));
            assertThrows(ResponseStatusException.class, () -> service.cover(1L, 99L));
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }
    @Test void deletingCoverPromotesRemainingImageAndDeletesFileOnlyAfterCommit() {
        var images = mock(TourImageRepository.class); var tours = mock(TourRepository.class); var storage = mock(TourImageStorage.class);
        var service = new TourImageService(images, tours, storage);
        when(tours.findByIdForUpdate(1L)).thenReturn(Optional.of(new Tour()));
        TourImage first = new TourImage(); first.setId(1L); first.setIsCover(true); first.setImageUrl("/api/media/tours/test.jpg");
        TourImage second = new TourImage(); second.setId(2L);
        when(images.findByTourIdOrderByIsCoverDescIdAsc(1L)).thenReturn(List.of(first, second));
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.delete(1L, 1L); assertTrue(second.getIsCover()); verifyNoInteractions(storage);
            TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
            verify(storage).remove(first.getImageUrl());
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }
}
