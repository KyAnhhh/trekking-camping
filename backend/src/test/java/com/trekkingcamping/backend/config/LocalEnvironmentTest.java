package com.trekkingcamping.backend.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

class LocalEnvironmentTest {
    @TempDir Path root;

    @Test void loadsBackendFileFromWorkspaceRoot() throws Exception {
        Files.createDirectory(root.resolve("backend"));
        Files.writeString(root.resolve("backend/.env"), "TEST_LOCAL_SETTING=synthetic\n");
        Map<String, String> loaded = new HashMap<>();
        LocalEnvironment.load(root, key -> null, key -> null, loaded::put);
        assertThat(loaded).containsEntry("TEST_LOCAL_SETTING", "synthetic");
    }

    @Test void respectsEnvironmentAndJvmOverridesAndCurrentDirectory() throws Exception {
        Files.createDirectory(root.resolve("backend"));
        Files.writeString(root.resolve("backend/.env"), "TEST_LOCAL_SETTING=wrong\n");
        Files.writeString(root.resolve(".env"), "TEST_LOCAL_SETTING=correct\nTEST_ENV_SETTING=local\nTEST_JVM_SETTING=local\n");
        Map<String, String> loaded = new HashMap<>();
        LocalEnvironment.load(root, key -> key.equals("TEST_ENV_SETTING") ? "env" : null,
                key -> key.equals("TEST_JVM_SETTING") ? "jvm" : null, loaded::put);
        assertThat(loaded).containsEntry("TEST_LOCAL_SETTING", "correct")
                .doesNotContainKeys("TEST_ENV_SETTING", "TEST_JVM_SETTING");
    }

    @Test void missingFileIsAllowed() {
        Map<String, String> loaded = new HashMap<>();
        LocalEnvironment.load(root, key -> null, key -> null, loaded::put);
        assertThat(loaded).isEmpty();
    }
}
