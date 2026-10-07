package com.trekkingcamping.backend.module.guide.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.guide.entity.Guide;
import com.trekkingcamping.backend.module.guide.repository.GuideRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GuideImportTest {
    GuideRepository repository = mock(GuideRepository.class);
    GuideService guides = new GuideService(repository, null, null, null, null, null);
    GuideImportService importer = new GuideImportService(new ObjectMapper(), repository, guides);
    String valid = "{\"code\":\"HDV_01\",\"fullName\":\"Guide Test\",\"experienceSince\":2020,\"active\":true}";
    MockMultipartFile file(String text) { return new MockMultipartFile("file", "guides.json", "application/json", text.getBytes(StandardCharsets.UTF_8)); }

    @Test void createsProfilesThroughExistingServiceWithoutReturningPrivateContacts() throws Exception {
        when(repository.save(any())).thenAnswer(inv -> { Guide g=inv.getArgument(0); g.setId(1L); return g; });
        var result = importer.importFile(file("["+valid.replace("\"active\":true", "\"phone\":\"0900000000\",\"email\":\"guide@example.test\",\"active\":false")+"]"));
        assertEquals(1, result.count()); assertEquals("HDV_01", result.guides().getFirst().code());
        verify(repository).save(argThat(g -> !g.getActive() && "guide@example.test".equals(g.getEmail())));
        verify(repository).flush();
        assertFalse(new ObjectMapper().writeValueAsString(result).contains("guide@example.test"));
    }

    @Test void validatesEntireBatchBeforeFirstWrite() {
        String invalid = valid.replace("HDV_01", "HDV_02").replace("2020", "1950");
        var error = assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("["+valid+","+invalid+"]")));
        assertTrue(error.getMessage().contains("thứ 2"));
        verify(repository, never()).save(any()); verify(repository, never()).flush();
    }

    @Test void rejectsDuplicateAndExistingCodesWithoutOverwriting() {
        assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("["+valid+","+valid+"]")));
        when(repository.existsByCode("HDV_01")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("["+valid+"]")));
        verify(repository, never()).save(any());
    }

    @Test void rejectsUnknownFieldsCoercionAndAmbiguousJson() {
        for (String bad : new String[]{"{}", "null", "[]", "[null]", "["+valid+"] []",
                "["+valid.replace("\"active\":true", "\"active\":\"true\"")+"]",
                "["+valid.replace("2020", "2020.5")+"]",
                "["+valid.replace("\"active\":true", "\"active\":true,\"id\":1")+"]",
                "["+valid.replace("\"active\":true", "\"active\":true,\"avatarUrl\":\"remote\"")+"]",
                "["+valid.replace("\"active\":true", "\"active\":true,\"active\":false")+"]"}) {
            assertThrows(IllegalArgumentException.class, () -> importer.importFile(file(bad)), bad);
        }
        verify(repository, never()).save(any());
    }

    @Test void validatesContactStatusAndCurrentYear() {
        for (String replacement : new String[]{"\"active\":null", "\"active\":true,\"phone\":\"not-a-phone\"", "\"active\":true,\"email\":\"invalid\""}) {
            assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("["+valid.replace("\"active\":true",replacement)+"]")));
        }
        assertThrows(IllegalArgumentException.class, () -> importer.importFile(file("["+valid.replace("2020", "2999")+"]")));
        verify(repository, never()).save(any());
    }

    @Test void acceptsUtf8BomAndRejectsBadEncodingAndSize() throws Exception {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        assertEquals(1, importer.importFile(file("\uFEFF["+valid+"]")).count());
        for (var upload : new MockMultipartFile[]{
                new MockMultipartFile("file", "data.csv", "text/csv", "data".getBytes()),
                new MockMultipartFile("file", "data.json", "application/json", new byte[0]),
                new MockMultipartFile("file", "data.json", "application/json", new byte[]{(byte)0xff}),
                new MockMultipartFile("file", "data.json", "application/json", new byte[1024*1024+1])}) {
            assertThrows(IllegalArgumentException.class, () -> importer.importFile(upload));
        }
        String many = "["+String.join(",", java.util.Collections.nCopies(101, valid))+"]";
        assertThrows(IllegalArgumentException.class, () -> importer.importFile(file(many)));
    }

    @Test void databaseConflictIsPropagatedToRollbackBatch() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate")).when(repository).flush();
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> importer.importFile(file("["+valid+"]")));
    }

    @Test void currentPreparedGuideFileMatchesImporter() throws Exception {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        byte[] bytes = Files.readAllBytes(Path.of("../docs/demo-data/guides.json"));
        int expected = new ObjectMapper().readTree(bytes).size();
        assertEquals(expected, importer.importFile(new MockMultipartFile("file", "guides.json", "application/json", bytes)).count());
    }
}
