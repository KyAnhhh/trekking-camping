package com.trekkingcamping.backend.module.tour.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;

@Component
public class TourImageStorage {
    private final Path root;
    private final String urlPrefix;
    @org.springframework.beans.factory.annotation.Autowired
    public TourImageStorage(@Value("${TOUR_UPLOAD_DIR:uploads/tours}") String directory) {
        this(directory, "/api/media/tours/");
    }
    public TourImageStorage(String directory, String urlPrefix) {
        root = Path.of(directory).toAbsolutePath().normalize();
        this.urlPrefix = urlPrefix;
    }
    public String save(MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024) throw new IllegalArgumentException("Ảnh phải có nội dung và không vượt quá 5 MB.");
        BufferedImage source;
        try (var stream = new MemoryCacheImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) throw new IllegalArgumentException("Chỉ nhận ảnh JPEG hoặc PNG hợp lệ.");
            var reader = readers.next();
            try {
                if (!Set.of("jpeg", "jpg", "png").contains(reader.getFormatName().toLowerCase(Locale.ROOT))) throw new IllegalArgumentException("Chỉ nhận ảnh JPEG hoặc PNG.");
                reader.setInput(stream);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || (long) width * height > 16_000_000) throw new IllegalArgumentException("Ảnh tối đa 16 megapixel.");
                source = reader.read(0);
            } finally { reader.dispose(); }
        } catch (javax.imageio.IIOException e) { throw new IllegalArgumentException("Không đọc được ảnh. Hãy chọn ảnh JPEG hoặc PNG khác."); }
        // Re-encode pixels: discard metadata and any attached non-image content.
        var output = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        var graphics = output.createGraphics();
        try { graphics.setColor(Color.WHITE); graphics.fillRect(0, 0, output.getWidth(), output.getHeight()); graphics.drawImage(source, 0, 0, null); }
        finally { graphics.dispose(); }
        Files.createDirectories(root);
        String name = UUID.randomUUID() + ".jpg";
        Path path = root.resolve(name);
        try (OutputStream stream = Files.newOutputStream(path, StandardOpenOption.CREATE_NEW)) {
            if (!ImageIO.write(output, "jpg", stream)) throw new IOException("Image encoder unavailable");
        } catch (IOException e) { Files.deleteIfExists(path); throw e; }
        return urlPrefix + name;
    }
    public Resource read(String name) {
        Path path = resolve(name);
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh.");
        return new FileSystemResource(path);
    }
    public void remove(String url) {
        if (url == null || !url.startsWith(urlPrefix)) return;
        try { Files.deleteIfExists(resolve(url.substring(urlPrefix.length()))); }
        catch (IOException e) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Could not remove an unused tour image"); }
    }
    private Path resolve(String name) {
        if (!name.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.jpg")) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        Path path = root.resolve(name).normalize();
        if (!path.getParent().equals(root)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return path;
    }
}
