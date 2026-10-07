package com.trekkingcamping.backend.module.guide.service;
import com.trekkingcamping.backend.module.tour.service.TourImageStorage;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import java.io.IOException;
@Component
public class GuideImageStorage {
    private final TourImageStorage delegate;
    public GuideImageStorage(@Value("${GUIDE_UPLOAD_DIR:uploads/guides}") String directory) {
        delegate = new TourImageStorage(directory, "/api/media/guides/");
    }
    public String save(MultipartFile file) throws IOException { return delegate.save(file); }
    public void remove(String url) { delegate.remove(url); }
    public Resource read(String name) { return delegate.read(name); }
}
