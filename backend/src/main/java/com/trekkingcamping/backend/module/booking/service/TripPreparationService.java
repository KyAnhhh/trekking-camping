package com.trekkingcamping.backend.module.booking.service;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.tour.repository.TourGearRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.time.*;
import java.nio.charset.StandardCharsets;

@Service
public class TripPreparationService {
 public record Item(String key,String label,boolean checked,boolean custom) {}
 public record View(Long bookingId,String tour,String status,LocalDate departureDate,LocalDate returnDate,
   LocalDateTime pickupAt,String pickupPoint,String requirements,List<Item> items,List<Map<String,Object>> itinerary,List<Map<String,Object>> guides) {
   public View(Long bookingId,String tour,String status,LocalDate departureDate,LocalDate returnDate,LocalDateTime pickupAt,String pickupPoint,String requirements,List<Item> items){this(bookingId,tour,status,departureDate,returnDate,pickupAt,pickupPoint,requirements,items,List.of(),List.of());}
 }
 private final BookingRepository bookings;private final UserRepository users;private final TourGearRepository gears;private final JdbcTemplate jdbc;
 public TripPreparationService(BookingRepository b,UserRepository u,TourGearRepository g,JdbcTemplate j){bookings=b;users=u;gears=g;jdbc=j;}
 @Transactional(readOnly=true) public View get(String email,Long id){return view(owned(email,id,false));}
 @Transactional(readOnly=true) public View forAssistant(Long userId,Long id){
  var u=users.findById(userId).filter(x->Boolean.TRUE.equals(x.getIsActive())).orElseThrow(this::missing);
  var v=get(u.getEmail(),id);
  // Custom items can contain personal notes: never send them to a model.
  return new View(v.bookingId(),v.tour(),v.status(),v.departureDate(),v.returnDate(),v.pickupAt(),v.pickupPoint(),v.requirements(),v.items().stream().filter(x->!x.custom()).toList(),v.itinerary(),v.guides());
 }
 @Transactional public void check(String email,Long id,String key,Boolean checked){
  var b=owned(email,id,true);if(checked==null)throw new IllegalArgumentException("Thiếu trạng thái checklist.");
  if(view(b).items().stream().noneMatch(x->x.key().equals(key)))throw missing();
  jdbc.update("INSERT INTO booking_checklist(booking_id,item_key,checked) VALUES(?,?,?) ON CONFLICT(booking_id,item_key) DO UPDATE SET checked=excluded.checked",id,key,checked);
 }
 @Transactional public void add(String email,Long id,String label){
  owned(email,id,true);if(label==null||label.isBlank()||label.length()>500)throw new IllegalArgumentException("Nội dung từ 1–500 ký tự.");
  if(jdbc.queryForObject("SELECT count(*) FROM booking_checklist WHERE booking_id=? AND label IS NOT NULL",Long.class,id)>=50)throw new IllegalArgumentException("Tối đa 50 mục riêng.");
  jdbc.update("INSERT INTO booking_checklist(booking_id,item_key,label,checked) VALUES(?,?,?,false)",id,"c:"+UUID.randomUUID(),label.trim());
 }
 @Transactional public void remove(String email,Long id,String key){owned(email,id,true);jdbc.update("DELETE FROM booking_checklist WHERE booking_id=? AND item_key=? AND label IS NOT NULL",id,key);}
 private View view(Booking b){
  var labels=new LinkedHashMap<String,String>();
  for(var gear:gears.findByTourId(b.getSchedule().getTour().getId()))if(!Boolean.TRUE.equals(gear.getIsProvided())&&gear.getGearName()!=null)labels.put("g:"+gear.getId(),gear.getGearName());
  String required=b.getSchedule().getTour().getRequiredGear();
  if(required!=null)for(String line:required.split("[\\r\\n;]+")){String text=line.trim();if(!text.isBlank())labels.put("t:"+UUID.nameUUIDFromBytes(text.getBytes(StandardCharsets.UTF_8)),text);}
  var stored=jdbc.queryForList("SELECT item_key,label,checked FROM booking_checklist WHERE booking_id=? ORDER BY item_key",b.getId());
  Map<String,Boolean> checks=new HashMap<>();Set<String> custom=new HashSet<>();
  for(var row:stored){String key=(String)row.get("item_key");checks.put(key,Boolean.TRUE.equals(row.get("checked")));if(row.get("label")!=null){labels.put(key,(String)row.get("label"));custom.add(key);}}
  var items=labels.entrySet().stream().map(e->new Item(e.getKey(),e.getValue(),checks.getOrDefault(e.getKey(),false),custom.contains(e.getKey()))).toList();
  var s=b.getSchedule();var profile=s.getTour().getAdventureProfile();
  var days=jdbc.queryForList("SELECT day_number,title,left(description,3000) AS description FROM tour_itineraries WHERE tour_id=? ORDER BY day_number LIMIT 30",s.getTour().getId());
  var team=jdbc.queryForList("SELECT g.full_name AS name,a.role FROM schedule_guides a JOIN guides g ON g.id=a.guide_id WHERE a.schedule_id=? AND a.response_status IN ('ACCEPTED','LEGACY') AND g.active=true ORDER BY a.id LIMIT 20",s.getId());
  return new View(b.getId(),s.getTour().getTitle(),b.getStatus(),s.getDepartureDate(),s.getReturnDate(),s.getPickupAt(),s.getPickupPoint(),profile==null?null:profile.getParticipationRequirements(),items,days,team);
 }
 private Booking owned(String email,Long id,boolean write){
  var u=users.findByEmail(email).filter(x->Boolean.TRUE.equals(x.getIsActive())).orElseThrow(this::missing);
  var b=(write?bookings.findByIdForUpdate(id):bookings.findById(id)).orElseThrow(this::missing);
  if(b.getUser()==null||!Objects.equals(u.getId(),b.getUser().getId()))throw missing();return b;
 }
 private ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy dữ liệu chuyến đi của bạn.");}
}
