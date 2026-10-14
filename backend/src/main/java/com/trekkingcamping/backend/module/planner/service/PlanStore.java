package com.trekkingcamping.backend.module.planner.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.module.planner.dto.PlanDtos.*;
import com.trekkingcamping.backend.module.planner.entity.SavedPlan;
import com.trekkingcamping.backend.module.planner.repository.SavedPlanRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import jakarta.persistence.EntityManager;
import java.util.List;
@Service
public class PlanStore {
    private final SavedPlanRepository plans; private final UserRepository users;
    private final ObjectMapper json; private final EntityManager em;
    public PlanStore(SavedPlanRepository plans, UserRepository users, ObjectMapper json, EntityManager em) {
        this.plans = plans; this.users = users; this.json = json; this.em = em;
    }
    @Transactional public Detail save(String email, long authVersion, Content content) {
        var user = users.findByEmailForUpdate(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        em.refresh(user);
        if (!Boolean.TRUE.equals(user.getIsActive()) || user.getAuthVersion() != authVersion)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.");
        if (plans.countByUserId(user.getId()) >= 50) throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã lưu 50 lịch trình. Hãy xóa lịch cũ trước khi tạo thêm.");
        if (plans.existsByUserIdAndCreatedAtAfter(user.getId(), java.time.Instant.now().minusSeconds(60)))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Vui lòng chờ một phút giữa hai lần tạo lịch trình.");
        var plan = new SavedPlan(); plan.setUser(user); plan.setTitle(content.itinerary().title());
        try { plan.setContent(json.writeValueAsString(content)); }
        catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException("Cannot encode itinerary"); }
        return detail(plans.save(plan));
    }
    @Transactional(readOnly = true) public List<Summary> list(String email) {
        return plans.findByUserEmailOrderByCreatedAtDesc(email).stream().map(p -> new Summary(p.getId(), p.getTitle(), p.getCreatedAt())).toList();
    }
    @Transactional(readOnly = true) public Detail get(String email, Long id) { return detail(owned(email, id)); }
    @Transactional public void delete(String email, Long id) { plans.delete(owned(email, id)); }
    private SavedPlan owned(String email, Long id) {
        return plans.findByIdAndUserEmail(id, email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lịch trình."));
    }
    private Detail detail(SavedPlan p) {
        try { return new Detail(p.getId(), p.getTitle(), p.getCreatedAt(), json.readValue(p.getContent(), Content.class)); }
        catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException("Cannot read saved itinerary"); }
    }
}
