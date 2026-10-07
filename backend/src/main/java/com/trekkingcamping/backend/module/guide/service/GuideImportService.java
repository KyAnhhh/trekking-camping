package com.trekkingcamping.backend.module.guide.service;

import com.fasterxml.jackson.databind.*;
import com.trekkingcamping.backend.module.guide.dto.GuideDtos.Edit;
import com.trekkingcamping.backend.module.guide.repository.GuideRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class GuideImportService {
    public record Imported(Long id, String code, String fullName) {}
    public record Result(int count, List<Imported> guides) {}
    private final ObjectMapper json;
    private final GuideRepository repository;
    private final GuideService guides;

    public GuideImportService(ObjectMapper json, GuideRepository repository, GuideService guides) {
        this.json = json.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                        DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                .enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS);
        this.repository = repository;
        this.guides = guides;
    }

    @Transactional(rollbackFor = Exception.class)
    public Result importFile(MultipartFile file) throws IOException {
        String name = file.getOriginalFilename();
        if (file.isEmpty() || file.getSize() > 1024 * 1024 || name == null
                || !name.toLowerCase(Locale.ROOT).endsWith(".json")) {
            throw new IllegalArgumentException("Chọn file JSON UTF-8 theo mẫu, tối đa 1 MB.");
        }
        List<Edit> entries;
        try {
            String content = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(file.getBytes())).toString();
            if (content.startsWith("\uFEFF")) content = content.substring(1);
            entries = json.readValue(content, json.getTypeFactory().constructCollectionType(List.class, Edit.class));
        } catch (com.fasterxml.jackson.core.JsonProcessingException | java.nio.charset.CharacterCodingException e) {
            // Do not echo parser input: the file may include private contact information.
            throw new IllegalArgumentException("File JSON sai cấu trúc, kiểu dữ liệu hoặc mã hóa. Dùng file mẫu; không thêm id, avatarUrl hoặc trường lạ.");
        }
        if (entries == null || entries.isEmpty() || entries.size() > 100) {
            throw new IllegalArgumentException("Mỗi file phải có từ 1 đến 100 hướng dẫn viên.");
        }
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < entries.size(); i++) {
            try {
                Edit entry = entries.get(i);
                guides.validate(entry);
                if (!codes.add(entry.code())) throw new IllegalArgumentException("Mã hướng dẫn viên bị trùng trong file.");
                if (repository.existsByCode(entry.code())) throw new IllegalArgumentException("Mã hướng dẫn viên đã tồn tại trong hệ thống.");
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Hướng dẫn viên thứ " + (i + 1) + ": " + e.getMessage());
            }
        }
        List<Imported> imported = new ArrayList<>();
        for (Edit entry : entries) {
            var saved = guides.create(entry).profile();
            imported.add(new Imported(saved.id(), saved.code(), saved.fullName()));
        }
        // Force unique-constraint errors inside the batch transaction; no partial import.
        repository.flush();
        return new Result(imported.size(), imported);
    }
}
