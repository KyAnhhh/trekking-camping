package com.trekkingcamping.backend.module.ingestion.service;

import org.springframework.ai.document.Document;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class IngestionService {

    private final VectorStore vectorStore;

    @Value("classpath:data/trekking-camping-guide.txt")
    private Resource trekkingGuideResource;

    public IngestionService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public void ingestTrekkingData() {
        // 1. Đọc nội dung file text
        TextReader textReader = new TextReader(trekkingGuideResource);
        List<Document> documents = textReader.get();

        // 2. Chia nhỏ văn bản (Chunking) thành từng đoạn nhỏ
        TokenTextSplitter textSplitter = new TokenTextSplitter(500, 100, 5, 10000, true);
        List<Document> chunks = textSplitter.apply(documents);

        // 3. Mã hóa bằng Local Embedding & lưu thẳng vào PgVector (Neon.tech)
        vectorStore.accept(chunks);
    }
}