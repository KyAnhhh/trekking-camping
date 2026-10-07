package com.trekkingcamping.backend.config;

import io.github.cdimascio.dotenv.Dotenv;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.function.BiConsumer;
import java.util.function.Function;

/** Local development only; deployed environment/JVM settings always take precedence. */
public final class LocalEnvironment {
    private LocalEnvironment() {}

    public static void load() {
        load(Path.of(System.getProperty("user.dir")), System::getenv,
                System::getProperty, System::setProperty);
    }

    static void load(Path workingDirectory, Function<String, String> environment,
                     Function<String, String> properties, BiConsumer<String, String> setter) {
        Path directory = workingDirectory;
        if (!Files.isRegularFile(directory.resolve(".env"))) {
            directory = workingDirectory.resolve("backend");
        }
        if (!Files.isRegularFile(directory.resolve(".env"))) return;
        Dotenv.configure().directory(directory.toAbsolutePath().toString()).load().entries()
                .forEach(entry -> {
                    if (environment.apply(entry.getKey()) == null && properties.apply(entry.getKey()) == null) {
                        setter.accept(entry.getKey(), entry.getValue());
                    }
                });
    }
}
