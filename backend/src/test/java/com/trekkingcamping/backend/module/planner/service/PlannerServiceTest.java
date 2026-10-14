package com.trekkingcamping.backend.module.planner.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.planner.dto.PlanDtos.*;
import com.trekkingcamping.backend.module.planner.repository.SavedPlanRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.chat.service.ChatService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class PlannerServiceTest {
    ChatService ai = mock(ChatService.class); PlanCatalog catalog = mock(PlanCatalog.class); PlanStore store = mock(PlanStore.class);
    UserRepository users = mock(UserRepository.class); SavedPlanRepository plans = mock(SavedPlanRepository.class);
    ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    PlannerService service = new PlannerService(ai,catalog,store,users,plans,json);
    Request request() { return new Request("Da Lat", LocalDate.now().plusDays(20),1,2,BigDecimal.valueOf(2000000),1,"camping"); }
    void owner() { User u = new User(); u.setId(1L); when(users.findByEmail("owner")).thenReturn(Optional.of(u)); when(catalog.matching(any())).thenReturn(List.of()); }
    Generated generated(List<Long> ids) { return new Generated("Plan","Summary",List.of(new Day(1,"Day one","Morning","Afternoon","Evening")),List.of("Check conditions"),ids); }
    @Test void validatedSuggestionUsesServerOptionsAndSavesOnlyForOwner() throws Exception {
        owner(); when(ai.generateStructured(anyString())).thenReturn(json.writeValueAsString(generated(List.of())));
        service.generate("owner",request());
        verify(store).save(eq("owner"),eq(0L),argThat(c -> c.tours().isEmpty() && c.request().people()==2));
    }
    @Test void inventedTourAndInvalidJsonNeverPersist() throws Exception {
        owner(); when(ai.generateStructured(anyString())).thenReturn(json.writeValueAsString(generated(List.of(999L))),"not-json");
        assertThrows(ResponseStatusException.class, () -> service.generate("owner",request()));
        assertThrows(ResponseStatusException.class, () -> service.generate("owner",request()));
        verifyNoInteractions(store);
    }
    @Test void dayCountAndUnknownFieldsAreRejected() throws Exception {
        String valid=json.writeValueAsString(generated(List.of()));
        assertThrows(ResponseStatusException.class, () -> service.parse(valid,2,List.of()));
        assertThrows(ResponseStatusException.class, () -> service.parse(valid.substring(0,valid.length()-1)+",\"price\":1}",1,List.of()));
        assertThrows(ResponseStatusException.class, () -> service.parse(valid+" {}",1,List.of()));
    }
    @Test void invalidInputAndRateLimitFailBeforeProvider() {
        assertThrows(IllegalArgumentException.class, () -> service.generate("owner",new Request("",LocalDate.now(),0,0,null,0,null)));
        owner(); when(plans.existsByUserIdAndCreatedAtAfter(eq(1L),any())).thenReturn(true);
        assertThrows(ResponseStatusException.class, () -> service.generate("owner",request()));
        verifyNoInteractions(ai,store);
    }
    @Test void ownerFilterPreventsReadingAndDeletingOthersSavedPlans() {
        var em=mock(jakarta.persistence.EntityManager.class);
        var storage=new PlanStore(plans,users,json,em);
        assertThrows(ResponseStatusException.class, () -> storage.get("other",7L));
        assertThrows(ResponseStatusException.class, () -> storage.delete("other",7L));
        verify(plans,never()).delete(any());
    }
}
