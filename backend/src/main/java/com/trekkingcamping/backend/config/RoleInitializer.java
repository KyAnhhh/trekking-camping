package com.trekkingcamping.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Reference data is initialized after Hibernate has created/validated the schema. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RoleInitializer implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(RoleInitializer.class);
    private final JdbcTemplate jdbc;

    public RoleInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Serialize startup seeders and normal role inserts until this transaction commits.
        jdbc.execute("LOCK TABLE roles IN SHARE ROW EXCLUSIVE MODE");
        synchronizeIdSequence();
        // PostgreSQL's unique name constraint also handles concurrent application startups.
        // Keep existing IDs, role names and user assignments intact.
        int added = jdbc.update("""
                INSERT INTO roles (name)
                SELECT required.name
                FROM (VALUES ('ROLE_USER'), ('ROLE_ADMIN'), ('ROLE_GUIDE')) AS required(name)
                WHERE NOT EXISTS (SELECT 1 FROM roles existing WHERE existing.name = required.name)
                ON CONFLICT (name) DO NOTHING
                """);
        log.info("Built-in roles initialized; added {} missing role(s).", added);
    }

    private void synchronizeIdSequence() {
        Long maxId = jdbc.queryForObject("SELECT MAX(id) FROM roles", Long.class);
        if (maxId == null) return; // Fresh table: preserve the sequence's configured start.

        // Discover SERIAL/IDENTITY's actual sequence, including schema and safely quoted names.
        String sequence = jdbc.queryForObject("""
                SELECT (
                    SELECT format('%I.%I', ns.nspname, seq.relname)
                    FROM pg_class seq
                    JOIN pg_namespace ns ON ns.oid = seq.relnamespace
                    WHERE seq.oid = pg_get_serial_sequence('roles', 'id')::regclass
                )
                """, String.class);
        if (sequence == null) {
            throw new IllegalStateException("roles.id has no owned SERIAL/IDENTITY sequence. Check the roles schema.");
        }
        SequenceState state = jdbc.queryForObject("SELECT last_value, is_called FROM " + sequence,
                (rs, rowNum) -> new SequenceState(rs.getLong("last_value"), rs.getBoolean("is_called")));
        if (state == null) throw new IllegalStateException("Cannot read the roles ID sequence.");
        if (state.lastValue() < maxId || state.lastValue() == maxId && !state.called()) {
            // RESTART is transactional; unlike setval it rolls back if seeding fails.
            // Never move a sequence backward or renumber existing roles/users.
            jdbc.execute("ALTER SEQUENCE " + sequence + " RESTART WITH " + Math.addExact(maxId, 1));
            log.info("Repaired roles ID sequence before initializing built-in roles.");
        }
    }

    private record SequenceState(long lastValue, boolean called) {}
}
