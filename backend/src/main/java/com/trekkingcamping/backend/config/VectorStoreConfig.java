package com.trekkingcamping.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.transformers.TransformersEmbeddingModel;
import org.springframework.ai.vectorstore.PgVectorStore;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Configuration
public class VectorStoreConfig {

    private static final Logger log = LoggerFactory.getLogger(VectorStoreConfig.class);

    @Bean
    public EmbeddingModel embeddingModel() {
        TransformersEmbeddingModel model = new TransformersEmbeddingModel();
        try {
            model.afterPropertiesSet();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khởi tạo local embedding", e);
        }
        return model;
    }

    @Bean
    @Primary
    public VectorStore vectorStore(JdbcTemplate jdbcTemplate, EmbeddingModel embeddingModel) {
        // Ensure table vector_store exists in PostgreSQL
        try {
            jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS vector_store (" +
                    "id UUID PRIMARY KEY, " +
                    "content TEXT, " +
                    "metadata JSONB, " +
                    "embedding TEXT" +
                    ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_vector_store_source_file ON vector_store ((metadata->>'source_file'))");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_vector_store_category ON vector_store ((metadata->>'category'))");
        } catch (Exception e) {
            log.warn("Could not ensure vector_store table: {}", e.getMessage());
        }

        boolean hasVector = false;
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM pg_available_extensions WHERE name = 'vector'", Integer.class);
            hasVector = (count != null && count > 0);
        } catch (Exception e) {
            log.debug("Could not check pg_available_extensions", e);
        }

        if (hasVector) {
            try {
                jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector");
                log.info("PostgreSQL pgvector extension is available. Initializing PgVectorStore.");
                PgVectorStore pgVectorStore = new PgVectorStore(jdbcTemplate, embeddingModel);
                pgVectorStore.afterPropertiesSet();
                return pgVectorStore;
            } catch (Exception e) {
                log.warn("Failed to initialize PgVectorStore: {}. Falling back to SimpleVectorStore.", e.getMessage());
            }
        } else {
            log.info("PostgreSQL pgvector extension is not installed. Using in-memory SimpleVectorStore.");
        }

        SimpleVectorStore store = new SimpleVectorStore(embeddingModel);
        // Pre-load all stored documents from PostgreSQL table into SimpleVectorStore
        try {
            ObjectMapper mapper = new ObjectMapper();
            List<Document> savedDocs = jdbcTemplate.query(
                    "SELECT id, content, metadata FROM vector_store",
                    (rs, rowNum) -> {
                        String id = rs.getString("id");
                        String content = rs.getString("content");
                        String metaStr = rs.getString("metadata");
                        Map<String, Object> meta = Map.of();
                        if (metaStr != null && !metaStr.isBlank()) {
                            try {
                                meta = mapper.readValue(metaStr, new TypeReference<Map<String, Object>>() {});
                            } catch (Exception ignored) {}
                        }
                        return new Document(id != null ? id : UUID.randomUUID().toString(), content != null ? content : "", meta);
                    }
            );
            if (!savedDocs.isEmpty()) {
                store.add(savedDocs);
                log.info("Pre-loaded {} knowledge documents from PostgreSQL into SimpleVectorStore.", savedDocs.size());
            }
        } catch (Exception e) {
            log.warn("Could not pre-load documents from vector_store into SimpleVectorStore", e);
        }

        return store;
    }
}
