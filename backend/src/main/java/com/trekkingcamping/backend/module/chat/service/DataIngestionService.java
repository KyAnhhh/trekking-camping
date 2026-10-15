package com.trekkingcamping.backend.module.chat.service;

import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ai.vectorstore.PgVectorStore;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class DataIngestionService {

    private final VectorStore vectorStore;
    private final TourRepository tourRepository;
    private final TourKnowledgeContent content;

    private final JdbcTemplate jdbc;

    public DataIngestionService(VectorStore vectorStore,
                                TourRepository tourRepository,
                                TourKnowledgeContent content,
                                JdbcTemplate jdbc) {
        this.vectorStore = vectorStore;
        this.tourRepository = tourRepository;
        this.content = content;

        this.jdbc = jdbc;
    }

    @Transactional(rollbackFor = Exception.class)
    public int ingestTourDataToVectorStore() {
        // Serialize full replacements, including an empty active catalog. JDBC and PgVector
        // participate in the same DB transaction so embedding failure restores the old index.
        jdbc.queryForList("SELECT pg_advisory_xact_lock(hashtext(?))", "tour-knowledge-sync");
        List<Tour> tours = tourRepository.findByIsActiveTrue();
        List<Document> documents = new ArrayList<>();

        for (Tour tour : tours) {
            var snapshot = content.snapshot(tour);

            // Tạo Document AI với Metadata
            Document doc = new Document(
                    snapshot.text(),
                    Map.of("tour_id", tour.getId(), "slug", tour.getSlug(), "category", "TOUR_INFO",
                            "content_version", TourKnowledgeContent.VERSION, "content_fingerprint", snapshot.fingerprint(),
                            "ingested_at",java.time.Instant.now().toString())
            );
            documents.addAll(new org.springframework.ai.transformer.splitter.TokenTextSplitter().apply(List.of(doc)));
        }

        // Only replace generated tour documents; user-uploaded TXT knowledge is preserved.
        jdbc.update("DELETE FROM " + PgVectorStore.VECTOR_TABLE_NAME + " WHERE metadata->>'category' = ?", "TOUR_INFO");
        if (!documents.isEmpty()) {
            vectorStore.add(documents);
        }

        return tours.size();
    }
}
