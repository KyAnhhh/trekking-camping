package com.trekkingcamping.backend.module.knowledge;

import com.trekkingcamping.backend.module.knowledge.service.KnowledgeService;
import org.junit.jupiter.api.Test;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class KnowledgeServiceTest {
    private final VectorStore vectorStore = mock(VectorStore.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final KnowledgeService service = new KnowledgeService(vectorStore, jdbc);

    @Test
    void invalidUploadNeverDeletesExistingKnowledge() {
        for (var file : new MockMultipartFile[]{
                new MockMultipartFile("file", "guide.txt", "text/plain", "   ".getBytes()),
                new MockMultipartFile("file", "guide.pdf", "application/pdf", "content".getBytes()),
                new MockMultipartFile("file", "guide.txt", "text/plain", new byte[]{(byte) 0xFF})}) {
            assertThrows(IllegalArgumentException.class, () -> service.uploadKnowledgeBase(file));
        }
        verifyNoInteractions(jdbc, vectorStore);
    }

    @Test
    void deletionUsesExactMetadataAndIsNotLimitedToFiftyChunks() {
        String query = "DELETE FROM vector_store WHERE metadata->>'source_file' = ?";
        when(jdbc.update(query, "guide.txt")).thenReturn(120);
        assertTrue(service.deleteKnowledgeByFileName("guide.txt"));
        verify(jdbc).update(query, "guide.txt");
        verifyNoInteractions(vectorStore);
    }
    @Test void publishingExcerptsRequiresExplicitOptIn() throws Exception {
        var file=new MockMultipartFile("file","guide.txt","text/plain","Synthetic public trekking advice.".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        service.uploadKnowledgeBase(file);
        verify(vectorStore).add(argThat(docs->docs.stream().allMatch(d->"CONTEXT_ONLY".equals(d.getMetadata().get("visibility")))));
        clearInvocations(vectorStore);
        service.uploadKnowledgeBase(file,true);
        verify(vectorStore).add(argThat(docs->docs.stream().allMatch(d->"PUBLIC".equals(d.getMetadata().get("visibility")))));
    }
}
