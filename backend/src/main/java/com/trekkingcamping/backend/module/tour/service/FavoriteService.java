package com.trekkingcamping.backend.module.tour.service;

import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;
import java.util.List;
import java.math.BigDecimal;

@Service
public class FavoriteService {
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final TourRepository tours;
    public FavoriteService(JdbcTemplate jdbc, UserRepository users, TourRepository tours) {
        this.jdbc = jdbc; this.users = users; this.tours = tours;
    }
    private long owner(String email) {
        if (email == null) throw new ResponseStatusException(UNAUTHORIZED, "Vui lòng đăng nhập");
        return users.findByEmail(email).filter(u -> Boolean.TRUE.equals(u.getIsActive()))
            .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Tài khoản không khả dụng")).getId();
    }
    public record Card(long id, String slug, String title, String location, String summary,
                       Integer difficultyLevel, Integer durationDays, Integer durationNights,
                       BigDecimal pricePerPax, String bannerUrl) {}
    public record Page(List<Card> items, int page, int size, long totalElements) {}
    private static final String JOIN = " FROM tour_favorites f JOIN tours t ON t.id=f.tour_id WHERE f.user_id=? AND t.is_active=true";
    @Transactional(readOnly = true)
    public List<Long> ids(String email) {
        return jdbc.queryForList("SELECT t.id" + JOIN + " ORDER BY t.id", Long.class, owner(email));
    }
    @Transactional(readOnly = true)
    public Page list(String email, int page, int size) {
        if (page < 0 || page > 100000 || size < 1 || size > 48)
            throw new ResponseStatusException(BAD_REQUEST, "Phân trang không hợp lệ");
        long user = owner(email);
        long total = jdbc.queryForObject("SELECT count(*)" + JOIN, Long.class, user);
        var items = jdbc.query("""
            SELECT t.id,t.slug,t.title,t.location,t.summary,t.difficulty_level,t.duration_days,
                   t.duration_nights,t.price_per_pax,
                   (SELECT i.image_url FROM tour_images i WHERE i.tour_id=t.id
                    ORDER BY i.is_cover DESC NULLS LAST,i.id LIMIT 1) AS banner
            """ + JOIN + " ORDER BY f.created_at DESC,t.id DESC LIMIT ? OFFSET ?",
            (r,n) -> new Card(r.getLong("id"),r.getString("slug"),r.getString("title"),
                r.getString("location"),r.getString("summary"),r.getObject("difficulty_level",Integer.class),
                r.getObject("duration_days",Integer.class),r.getObject("duration_nights",Integer.class),
                r.getBigDecimal("price_per_pax"),r.getString("banner")), user,size,(long)page*size);
        return new Page(items,page,size,total);
    }
    @Transactional
    public void save(String email, long tourId) {
        long user = owner(email);
        tours.findByIdForUpdate(tourId).filter(t -> Boolean.TRUE.equals(t.getIsActive()))
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Tour không khả dụng"));
        jdbc.update("INSERT INTO tour_favorites(user_id,tour_id) VALUES (?,?) ON CONFLICT(user_id,tour_id) DO NOTHING", user,tourId);
    }
    @Transactional
    public void remove(String email, long tourId) {
        jdbc.update("DELETE FROM tour_favorites WHERE user_id=? AND tour_id=?", owner(email),tourId);
    }
}
