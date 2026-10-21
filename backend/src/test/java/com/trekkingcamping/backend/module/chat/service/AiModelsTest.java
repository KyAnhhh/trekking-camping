package com.trekkingcamping.backend.module.chat.service;
import com.trekkingcamping.backend.module.chat.entity.*;
import com.trekkingcamping.backend.module.chat.repository.*;
import com.trekkingcamping.backend.config.GeminiProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.web.server.ResponseStatusException;

class AiModelsTest {
    final AiConfigurationRepository configs=mock(AiConfigurationRepository.class);
    final AiConfigurationAuditRepository audits=mock(AiConfigurationAuditRepository.class);
    final AiModels service=new AiModels(configs,audits,new GeminiProperties(),new ObjectMapper());
    final AiConfiguration row=new AiConfiguration();
    AiModelsTest(){row.setId(1);row.setDocument("{}");when(configs.findById(1)).thenReturn(Optional.of(row));when(configs.locked()).thenReturn(Optional.of(row));}
    @Test void gemmaHiddenByDefaultAndNotSelectable() {
        assertEquals(2,service.view().settings().models().stream().filter(m->m.id().startsWith("gemma-")).count());
        assertTrue(service.available().models().stream().noneMatch(m->m.id().startsWith("gemma-")));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.resolve("gemma-4-31b-it",false)).getStatusCode().value());
        assertThrows(ResponseStatusException.class,()->service.resolve("https://attacker.test",false));
    }
    @Test void enableRequiresAttestationAndDefaultsCannotBeDisabled() {
        var s=service.view().settings();
        var bad=s.models().stream().map(m->new AiModels.Model(m.id(),m.label(),true,true,false)).toList();
        assertThrows(IllegalArgumentException.class,()->service.save(new AiModels.Update(0,new AiModels.Settings(bad,s.chatDefault(),s.plannerDefault())),"admin"));
        assertEquals(400,assertThrows(ResponseStatusException.class,()->service.resolve(null,false)).getStatusCode().value());
        assertEquals(400,assertThrows(ResponseStatusException.class,()->service.resolve(null,true)).getStatusCode().value());
    }
    @Test void saveAuditsAndStaleRevisionCannotOverwrite() {
        var s=service.view().settings();assertEquals(1,service.save(new AiModels.Update(0,s),"admin").revision());
        verify(audits,times(2)).save(any());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.save(new AiModels.Update(0,s),"other")).getStatusCode().value());
        assertEquals(s,service.view().settings());
        verify(configs,never()).insertDefaultIfMissing();
    }
    @Test void firstSaveCreatesMissingDefaultThenLocksAndAudits() {
        when(configs.findById(1)).thenReturn(Optional.empty());
        var initial=service.view();assertEquals(0,initial.revision());
        when(configs.locked()).thenReturn(Optional.empty(),Optional.of(row));
        var saved=service.save(new AiModels.Update(initial.revision(),initial.settings()),"admin");
        assertEquals(1,saved.revision());
        var order=inOrder(configs);order.verify(configs).findById(1);order.verify(configs).locked();
        order.verify(configs).insertDefaultIfMissing();order.verify(configs).locked();
        verify(audits,times(2)).save(any());
    }
    @Test void concurrentFirstSaveCannotOverwriteWinner() {
        var initial=service.view().settings();
        row.setRevision(1);
        when(configs.locked()).thenReturn(Optional.empty(),Optional.of(row));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.save(new AiModels.Update(0,initial),"other")).getStatusCode().value());
        verify(configs).insertDefaultIfMissing();verifyNoInteractions(audits);
        assertEquals(1,row.getRevision());assertEquals("{}",row.getDocument());
    }
    @Test void enabledGemmaCanBeAssignedAndRestoredAsNewRevision() throws Exception {
        var s=service.view().settings();
        var rows=s.models().stream().map(m->new AiModels.Model(m.id(),m.label(),true,true,true)).toList();
        var next=new AiModels.Settings(rows,"gemma-4-31b-it","gemma-4-26b-a4b-it");
        service.save(new AiModels.Update(0,next),"admin");assertEquals("gemma-4-31b-it",service.resolve("gemma-4-31b-it",false));assertEquals("gemma-4-26b-a4b-it",service.resolve("gemma-4-26b-a4b-it",true));
        assertNull(service.view().settings().chatDefault());assertNull(service.view().settings().plannerDefault());
        var previous=new AiConfigurationAudit();previous.setDocument(new ObjectMapper().writeValueAsString(s));when(audits.findById(0L)).thenReturn(Optional.of(previous));
        assertEquals(2,service.restore(0,1,"admin").revision());assertThrows(ResponseStatusException.class,()->service.resolve(null,false));
    }
    @Test void metricsContainOnlyTimingCountsAndErrorCode() {
        service.measured("test",10,null);service.measured("test",20,"503");
        var u=service.metrics().get("test");assertEquals(2,u.calls());assertEquals(1,u.failures());assertEquals(30,u.totalMillis());assertEquals("503",u.lastError());
    }
}
