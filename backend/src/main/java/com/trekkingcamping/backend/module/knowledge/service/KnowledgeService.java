package com.trekkingcamping.backend.module.knowledge.service;

import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.PgVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class KnowledgeService {
    private final VectorStore vectorStore;
    private final JdbcTemplate jdbcTemplate;
    // PgVectorStore 1.0.0-M1 uses this fixed table name with the configured JdbcTemplate.
    private static final String TABLE = PgVectorStore.VECTOR_TABLE_NAME;

    public KnowledgeService(VectorStore vectorStore, JdbcTemplate jdbcTemplate) {
        this.vectorStore = vectorStore;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(rollbackFor = Exception.class)
    public int uploadKnowledgeBase(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank() || !filename.toLowerCase(Locale.ROOT).endsWith(".txt")) {
            throw new IllegalArgumentException("Chỉ hỗ trợ tài liệu .txt mã hóa UTF-8.");
        }
        if (file.isEmpty() || file.getSize() > 1024 * 1024) {
            throw new IllegalArgumentException("Tài liệu phải có nội dung và không vượt quá 1 MB.");
        }
        String content;
        try {
            content = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(file.getBytes())).toString();
        } catch (java.nio.charset.CharacterCodingException exception) {
            throw new IllegalArgumentException("Tài liệu phải được mã hóa UTF-8.");
        }
        if (content.isBlank()) throw new IllegalArgumentException("Tài liệu không có nội dung.");
        var document = new Document(content, Map.of("filename", filename, "source_file", filename));
        var chunks = new TokenTextSplitter().apply(List.of(document));
        if (chunks.isEmpty()) throw new IllegalArgumentException("Không tìm thấy nội dung để nạp.");
        lockFile(filename);
        jdbcTemplate.update("DELETE FROM " + TABLE + " WHERE metadata->>'source_file' = ?", filename);
        vectorStore.add(chunks);
        return chunks.size();
    }

    @Transactional(readOnly = true)
    public List<String> getAllKnowledgeFiles() {
        return jdbcTemplate.queryForList("SELECT DISTINCT metadata->>'source_file' AS filename FROM " + TABLE
                + " WHERE metadata->>'source_file' IS NOT NULL ORDER BY filename", String.class);
    }

    @Transactional
    public boolean deleteKnowledgeByFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) throw new IllegalArgumentException("Vui lòng chọn tài liệu cần xóa.");
        lockFile(fileName);
        return jdbcTemplate.update("DELETE FROM " + TABLE + " WHERE metadata->>'source_file' = ?", fileName) > 0;
    }

    private void lockFile(String filename) {
        // Serialize replacement/deletion of one document, across application instances.
        jdbcTemplate.queryForList("SELECT pg_advisory_xact_lock(hashtext(?))", filename);
    }
}
