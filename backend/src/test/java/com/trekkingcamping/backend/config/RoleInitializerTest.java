package com.trekkingcamping.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import java.sql.ResultSet;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RoleInitializerTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final RoleInitializer initializer = new RoleInitializer(jdbc);

    @Test void repairsManuallyInsertedIdsBeforeAttemptingToSeed() throws Exception {
        existing(2L, 1L, true);
        initializer.run(null);
        var order = inOrder(jdbc);
        order.verify(jdbc).execute("LOCK TABLE roles IN SHARE ROW EXCLUSIVE MODE");
        order.verify(jdbc).queryForObject("SELECT MAX(id) FROM roles", Long.class);
        order.verify(jdbc).execute("ALTER SEQUENCE public.roles_id_seq RESTART WITH 3");
        order.verify(jdbc).update(contains("INSERT INTO roles"));
    }

    @Test void uncalledSequenceAtExistingMaximumMustAlsoAdvance() throws Exception {
        existing(2L, 2L, false);
        initializer.run(null);
        verify(jdbc).execute("ALTER SEQUENCE public.roles_id_seq RESTART WITH 3");
    }

    @Test void preservesSequenceAlreadyAheadAndCalledMaximum() throws Exception {
        for (long sequenceValue : new long[]{2L, 100L}) {
            reset(jdbc); existing(2L, sequenceValue, true);
            initializer.run(null);
            verify(jdbc, never()).execute(startsWith("ALTER SEQUENCE"));
            verify(jdbc).update(contains("ON CONFLICT (name) DO NOTHING"));
        }
    }

    @Test void freshEmptyTableKeepsConfiguredStart() {
        when(jdbc.queryForObject("SELECT MAX(id) FROM roles", Long.class)).thenReturn(null);
        initializer.run(null);
        verify(jdbc, never()).execute(startsWith("ALTER SEQUENCE"));
        verify(jdbc, never()).queryForObject(anyString(), eq(String.class));
        verify(jdbc).update(contains("INSERT INTO roles"));
    }

    @Test void discoversAndQuotesTheActualSequenceInsteadOfAssumingItsName() throws Exception {
        existing(20L, 2L, true);
        when(jdbc.queryForObject(contains("pg_get_serial_sequence"), eq(String.class)))
                .thenReturn("\"custom schema\".\"Role IDs\"");
        initializer.run(null);
        verify(jdbc).execute("ALTER SEQUENCE \"custom schema\".\"Role IDs\" RESTART WITH 21");
    }

    @Test void missingSequenceStopsSeedingWithClearError() {
        when(jdbc.queryForObject("SELECT MAX(id) FROM roles", Long.class)).thenReturn(2L);
        var error = assertThrows(IllegalStateException.class, () -> initializer.run(null));
        assertTrue(error.getMessage().contains("SERIAL/IDENTITY"));
        verify(jdbc, never()).update(anyString());
    }

    @SuppressWarnings("unchecked")
    private void existing(long maxId, long sequenceValue, boolean called) throws Exception {
        when(jdbc.queryForObject("SELECT MAX(id) FROM roles", Long.class)).thenReturn(maxId);
        when(jdbc.queryForObject(contains("pg_get_serial_sequence"), eq(String.class))).thenReturn("public.roles_id_seq");
        ResultSet row = mock(ResultSet.class);
        when(row.getLong("last_value")).thenReturn(sequenceValue);
        when(row.getBoolean("is_called")).thenReturn(called);
        when(jdbc.queryForObject(startsWith("SELECT last_value, is_called FROM "), any(RowMapper.class)))
                .thenAnswer(call -> ((RowMapper<?>) call.getArgument(1)).mapRow(row, 0));
    }
}
