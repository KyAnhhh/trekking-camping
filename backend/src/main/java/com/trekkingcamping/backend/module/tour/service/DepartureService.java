package com.trekkingcamping.backend.module.tour.service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.math.BigDecimal;
import java.util.*;

@Service
public class DepartureService {
    private final JdbcTemplate jdbc;
    public DepartureService(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public record Tour(long id,String slug,String title,String location,Integer difficultyLevel,
                       Integer durationDays,Integer durationNights,BigDecimal pricePerPax,String bannerUrl) {}
    public record Departure(long id,Tour tour,LocalDate departureDate,LocalDate returnDate,
                            Integer availableSlots,String status,boolean simulated) {}
    public record Result(List<Departure> items,boolean truncated,String timezone) {}
    @Transactional(readOnly=true)
    public Result list(LocalDate from,LocalDate to,String location,Integer difficulty,int people,boolean availableOnly) {
        if(from==null||to==null||to.isBefore(from)||ChronoUnit.DAYS.between(from,to)>92
            ||people<1||people>1000||difficulty!=null&&(difficulty<1||difficulty>3)
            ||location!=null&&location.length()>100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Khoảng ngày tối đa 93 ngày; số người và bộ lọc phải hợp lệ.");
        var args=new ArrayList<Object>(); args.add(from);args.add(to);
        String sql="""
            SELECT s.id,s.departure_date,s.return_date,s.available_slots,s.status,
             t.id AS tour_id,t.slug,t.title,t.location,t.difficulty_level,t.duration_days,t.duration_nights,t.price_per_pax,
             (SELECT i.image_url FROM tour_images i WHERE i.tour_id=t.id ORDER BY i.is_cover DESC NULLS LAST,i.id LIMIT 1) AS banner,
             concat_ws(' ',t.title,t.summary,t.trek_source,s.pickup_point) AS demo_text
            FROM tour_schedules s JOIN tours t ON t.id=s.tour_id
            WHERE t.is_active=true AND s.departure_date BETWEEN ? AND ?
            """;
        if(location!=null&&!location.isBlank()) {
            sql+=" AND lower(t.location) LIKE lower(?) ESCAPE '!'";
            args.add("%"+location.trim().replace("!","!!").replace("%","!%").replace("_","!_")+"%");
        }
        if(difficulty!=null){sql+=" AND t.difficulty_level=?";args.add(difficulty);}
        if(availableOnly){sql+=" AND s.status='OPEN' AND s.available_slots>=? AND s.departure_date>?";args.add(people);args.add(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")));}
        sql+=" ORDER BY s.departure_date,s.id LIMIT 501";
        var items=jdbc.query(sql,(r,n)->new Departure(r.getLong("id"),new Tour(r.getLong("tour_id"),r.getString("slug"),r.getString("title"),r.getString("location"),
            r.getObject("difficulty_level",Integer.class),r.getObject("duration_days",Integer.class),r.getObject("duration_nights",Integer.class),r.getBigDecimal("price_per_pax"),r.getString("banner")),
            r.getObject("departure_date",LocalDate.class),r.getObject("return_date",LocalDate.class),r.getObject("available_slots",Integer.class),r.getString("status"),
            r.getString("demo_text").toLowerCase(Locale.ROOT).matches("(?s).*(mô phỏng|simulation|synthetic|\\[demo-).*")),args.toArray());
        return new Result(items.stream().limit(500).toList(),items.size()>500,"Asia/Ho_Chi_Minh");
    }
}
