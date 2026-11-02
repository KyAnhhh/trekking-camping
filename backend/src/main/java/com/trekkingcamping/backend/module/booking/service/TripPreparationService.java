package com.trekkingcamping.backend.module.booking.service;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.tour.repository.TourGearRepository;
import com.trekkingcamping.backend.module.tour.repository.TourRepository;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.tour.entity.TourGear;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.time.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

@Service
public class TripPreparationService {
 public record Item(String key,String label,boolean checked,boolean custom) {}
 public record View(Long bookingId,String tour,String status,LocalDate departureDate,LocalDate returnDate,
   LocalDateTime pickupAt,String pickupPoint,String requirements,List<Item> items,List<Map<String,Object>> itinerary,List<Map<String,Object>> guides) {
   public View(Long bookingId,String tour,String status,LocalDate departureDate,LocalDate returnDate,LocalDateTime pickupAt,String pickupPoint,String requirements,List<Item> items){this(bookingId,tour,status,departureDate,returnDate,pickupAt,pickupPoint,requirements,items,List.of(),List.of());}
 }

 public record PackingItem(String id, String name, String desc, String category, boolean isRequired, boolean canRent, Long rentalPrice) {}
 public record PackingCategory(String key, String name, String icon, List<PackingItem> items) {}
 public record PackingCard(String title, String destination, String seasonNotice, String temperatureRange, String terrainNotice, List<PackingCategory> categories, List<String> quickPills) {}

 private final BookingRepository bookings;
 private final UserRepository users;
 private final TourGearRepository gears;
 private final JdbcTemplate jdbc;
 private final TourRepository tours;

 @org.springframework.beans.factory.annotation.Autowired
 public TripPreparationService(BookingRepository b, UserRepository u, TourGearRepository g, JdbcTemplate j, TourRepository t) {
  bookings = b; users = u; gears = g; jdbc = j; tours = t;
 }

 public TripPreparationService(BookingRepository b, UserRepository u, TourGearRepository g, JdbcTemplate j) {
  this(b, u, g, j, null);
 }
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

 @Transactional(readOnly = true)
 public PackingCard generatePackingList(String destination, Integer month, Integer durationDays) {
  if (month == null || month < 1 || month > 12) {
   month = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).getMonthValue();
  }
  int days = (durationDays == null || durationDays < 1 || durationDays > 30) ? 2 : durationDays;
  String rawDest = destination == null ? "" : destination.trim();
  String destLower = rawDest.toLowerCase(Locale.ROOT);

  // 1. Try finding matching Tour in database
  Tour matchedTour = null;
  if (tours != null && !rawDest.isBlank()) {
   try {
    var found = tours.searchActiveTours("%" + rawDest.toLowerCase() + "%");
    if (!found.isEmpty()) matchedTour = found.get(0);
    if (matchedTour == null) {
     var all = tours.findByIsActiveTrue();
     for (var t : all) {
      if ((t.getTitle() != null && t.getTitle().toLowerCase().contains(destLower))
        || (t.getLocation() != null && t.getLocation().toLowerCase().contains(destLower))
        || (t.getSlug() != null && t.getSlug().toLowerCase().contains(destLower))) {
       matchedTour = t;
       break;
      }
     }
    }
   } catch (Exception ignored) {}
  }

  String displayName = matchedTour != null ? matchedTour.getTitle() : (rawDest.isBlank() ? "Cung đường Trekking Dã ngoại" : rawDest);
  if (matchedTour != null && matchedTour.getDurationDays() != null && durationDays == null) {
   days = matchedTour.getDurationDays();
  }

  // 2. Identify Geography & Regional Climate
  boolean isNorthMountain = destLower.matches(".*(fansipan|phaxipang|bạch mộc|bach moc|ky quan san|lảo thẩn|lao than|putaleng|tà xùa|ta xua|nhìu cồ san|châu mộc|sa pa|sapa|y tý|hà giang|chiêu lầu thi|mẫu sơn).*");
  boolean isSouthHills = destLower.matches(".*(tà năng|ta nang|phan dũng|phan dung|bidoup|núi bà|núi bà đen|cát tiên|nam cát tiên|đà lạt|da lat|langbiang|chư yang sin|đắk nông).*");
  boolean isCoastal = destLower.matches(".*(cực đông|mũi đôi|vĩnh hy|phú yên|núi chúa|hòn bà).*");

  String seasonNotice;
  String temperatureRange;
  String terrainNotice;

  if (isNorthMountain) {
   if (month >= 11 || month <= 2) {
    seasonNotice = "Tháng " + month + " (Mùa đông rét đậm & Săn mây Tây Bắc)";
    temperatureRange = "Đêm 2°C - 7°C tại lán nghỉ • Đỉnh núi có thể xuống 0°C và gió giật cấp 5-6";
    terrainNotice = "Độ cao > 2.800m • Vách đá vôi dốc gắt, bậc thang gỗ và đá trơn";
   } else if (month >= 3 && month <= 5) {
    seasonNotice = "Tháng " + month + " (Mùa hoa Đỗ Quyên nở & Tiết trời khô ráo)";
    temperatureRange = "Ngày 16°C - 22°C • Đêm 8°C - 14°C mát lạnh dễ chịu";
    terrainNotice = "Độ cao lớn • Đường mòn khô thoáng, tầm nhìn quang đãng";
   } else if (month >= 6 && month <= 8) {
    seasonNotice = "Tháng " + month + " (Mùa mưa hè Tây Bắc & Rừng rậm ẩm ướt)";
    temperatureRange = "Ngày 20°C - 26°C • Đêm 14°C - 18°C • Mưa rào bất chợt";
    terrainNotice = "Đá bám rêu trơn, rừng rậm rạp nhiều vắt rừng";
   } else {
    seasonNotice = "Tháng " + month + " (Mùa thu vàng & Lúa chín bậc thang)";
    temperatureRange = "Ngày 18°C - 24°C • Đêm 10°C - 15°C • Tiết trời lý tưởng nhất năm";
    terrainNotice = "Đường mòn khô ráo, tầm nhìn săn mây rộng mở";
   }
  } else if (isSouthHills) {
   if (month >= 11 || month <= 4) {
    seasonNotice = "Tháng " + month + " (Mùa cỏ khô & Nắng gió lộng lẫy)";
    temperatureRange = "Ngày 27°C - 33°C (Nắng gắt) • Đêm 14°C - 18°C lộng gió trên đồi cỏ";
    terrainNotice = "Đồi cỏ dốc trập trùng, đất khô tơi xốp, thiếu nguồn nước tự nhiên";
   } else {
    seasonNotice = "Tháng " + month + " (Mùa cỏ xanh & Mưa nguồn suối lũ)";
    temperatureRange = "Ngày 24°C - 28°C • Đêm 16°C - 20°C mát ẩm";
    terrainNotice = "Đường đất đỏ trơn trượt, suối Phan Dũng nước dâng xiết";
   }
  } else if (isCoastal) {
   seasonNotice = "Tháng " + month + " (Khí hậu duyên hải ven biển & Cồn cát)";
   temperatureRange = "Ngày 28°C - 34°C nắng gắt gió biển • Đêm 22°C - 25°C";
   terrainNotice = "Đồi cát lún, ghềnh đá sát biển, nhiệt độ bốc hơi cao";
  } else {
   seasonNotice = "Tháng " + month + " (Khí hậu dã ngoại rừng núi tổng quát)";
   temperatureRange = "Ngày 22°C - 28°C • Đêm 15°C - 20°C";
   terrainNotice = "Đường mòn tự nhiên, dốc thoai thoải kết hợp suối cạn";
  }

  // 3. Collect items and check against database TourGears for rental prices
  Map<String, TourGear> tourGearMap = new HashMap<>();
  if (matchedTour != null) {
   try {
    for (var g : gears.findByTourId(matchedTour.getId())) {
     if (g.getGearName() != null) {
      tourGearMap.put(g.getGearName().toLowerCase(Locale.ROOT), g);
     }
    }
   } catch (Exception ignored) {}
  }

  java.util.function.BiFunction<String, Long, Long[]> rentalLookup = (name, fallbackPrice) -> {
   for (var entry : tourGearMap.entrySet()) {
    if (name.toLowerCase(Locale.ROOT).contains(entry.getKey()) || entry.getKey().contains(name.toLowerCase(Locale.ROOT))) {
     var tg = entry.getValue();
     if (tg.getRentalPrice() != null && tg.getRentalPrice().compareTo(BigDecimal.ZERO) > 0) {
      return new Long[]{1L, tg.getRentalPrice().longValue()};
     }
    }
   }
   return fallbackPrice > 0 ? new Long[]{1L, fallbackPrice} : new Long[]{0L, 0L};
  };

  // 4. Construct 5 Category Groups
  List<PackingCategory> categories = new ArrayList<>();

  // Category 1: Trang phục 3 lớp (Layering)
  List<PackingItem> clothing = new ArrayList<>();
  clothing.add(new PackingItem("c_base", "Áo Base Layer thoát mồ hôi nhanh (2-3 chiếc)", "Chất liệu sợi tổng hợp hoặc len Merino; KHÔNG mặc áo cotton vì giữ mồ hôi dễ gây nhiễm lạnh", "CLOTHING", true, false, 0L));
  if (isNorthMountain && (month >= 10 || month <= 3)) {
   clothing.add(new PackingItem("c_mid_fleece", "Áo nỉ lót lông Mid-layer / Áo phao lông vũ siêu nhẹ", "Giữ ấm thân nhiệt khi dừng nghỉ trên độ cao > 2.000m", "CLOTHING", true, false, 0L));
   clothing.add(new PackingItem("c_outer_shell", "Áo khoác gió Outer Shell cản gió cấp 6 & chống nước", "Chuẩn Gore-Tex hoặc trượt nước, có mũ trùm đầu cản gió buốt", "CLOTHING", true, false, 0L));
   clothing.add(new PackingItem("c_thermal_gloves", "Găng tay giữ nhiệt cản gió & Mũ len bịt tai", "Cần thiết khi summit đỉnh sáng sớm hoặc gió giật", "CLOTHING", true, false, 0L));
  } else {
   clothing.add(new PackingItem("c_windbreaker", "Áo khoác gió dã ngoại nhẹ & cản gió", "Bảo vệ cơ thể khi lên đỉnh đồi gió mạnh", "CLOTHING", true, false, 0L));
  }
  clothing.add(new PackingItem("c_pants", "Quần trekking co giãn nhanh khô (2 chiếc)", "Chống rách, chống trầy xước do gai góc và côn trùng", "CLOTHING", true, false, 0L));
  if (!isNorthMountain || month >= 5) {
   clothing.add(new PackingItem("c_sun_hat", "Mũ tai bèo rộng vành & Khăn đa năng chống nắng", "Bảo vệ gáy và mặt khỏi tia UV khi đi qua đồi trống", "CLOTHING", true, false, 0L));
  }
  categories.add(new PackingCategory("CLOTHING", "Trang phục 3 lớp (Layering)", "Shirt", clothing));

  // Category 2: Giày & Chân
  List<PackingItem> footwear = new ArrayList<>();
  footwear.add(new PackingItem("f_shoes", "Giày trekking chuyên dụng đế gai sâu (Vibram)", "Bám đá ướt, bảo vệ mũi chân khi va đập; nên chọn rộng hơn 0.5 - 1 size", "FOOTWEAR", true, false, 0L));
  footwear.add(new PackingItem("f_socks", "Tất len dã ngoại đệm dày chống phồng rộp (3-4 đôi)", "Giảm ma sát giữa bàn chân và lòng giày, giữ ấm bàn chân ban đêm", "FOOTWEAR", true, false, 0L));
  var poleRent = rentalLookup.apply("gậy", 40000L);
  footwear.add(new PackingItem("f_poles", "Gậy trekking trợ lực hợp kim nhôm (1 cặp)", "Giảm 25% trọng tải dồn lên khớp gối khi xuống dốc gắt", "FOOTWEAR", false, poleRent[0] == 1L, poleRent[1]));
  if (isNorthMountain || (isSouthHills && month >= 5 && month <= 10)) {
   footwear.add(new PackingItem("f_gaiters", "Xà cạp che cổ giày (Gaiters)", "Ngăn bùn đất, sỏi nhỏ lọt vào giày và chống vắt rừng bám", "FOOTWEAR", false, false, 0L));
  }
  categories.add(new PackingCategory("FOOTWEAR", "Giày & Chăm sóc chân", "Footprints", footwear));

  // Category 3: Ngủ lều & Trại dã ngoại
  List<PackingItem> camping = new ArrayList<>();
  var bagRent = rentalLookup.apply("túi ngủ", isNorthMountain ? 120000L : 80000L);
  String bagDesc = isNorthMountain ? "Túi ngủ chịu nhiệt từ 0°C đến -5°C Naturehike giữ ấm lán 2.800m" : "Túi ngủ dã ngoại thoải mái 15°C - 20°C";
  camping.add(new PackingItem("camp_bag", "Túi ngủ dã ngoại chuyên dụng", bagDesc, "CAMPING", true, bagRent[0] == 1L, bagRent[1]));
  var tentRent = rentalLookup.apply("lều", 180000L);
  camping.add(new PackingItem("camp_tent", "Lều cắm trại 2 lớp chống mưa & chịu gió", "Lều đôi chống nước PU 3000mm kèm cọc neo gió đồi", "CAMPING", false, tentRent[0] == 1L, tentRent[1]));
  camping.add(new PackingItem("camp_mat", "Thảm xốp foil nhôm cách nhiệt lót lều", "Ngăn hơi ẩm và khí lạnh từ đất bốc lên suốt đêm", "CAMPING", true, false, 0L));
  categories.add(new PackingCategory("CAMPING", "Ngủ lều & Trại dã ngoại", "Tent", camping));

  // Category 4: Nước & Dinh dưỡng
  List<PackingItem> nutrition = new ArrayList<>();
  String waterVol = isSouthHills ? "3.0L - 4.0L / ngày (Cung đồi cỏ không có nguồn nước tự nhiên)" : "2.0L - 2.5L / ngày";
  nutrition.add(new PackingItem("nut_water", "Bình nước giữ nhiệt / Túi nước dẻo (" + waterVol + ")", "Duy trì uống ngụm nhỏ mỗi 15-20 phút di chuyển", "NUTRITION", true, false, 0L));
  nutrition.add(new PackingItem("nut_electrolytes", "Gói bột điện giải Oresol / Gel năng lượng (4-6 gói)", "Bù muối khoáng mất qua mồ hôi, chống chuột rút co cơ", "NUTRITION", true, false, 0L));
  nutrition.add(new PackingItem("nut_snacks", "Đồ ăn nhẹ: Chocolate, hạt điều, thanh hạt Granola", "Bổ sung calo tức thì khi đói hoặc hạ đường huyết giữa dốc", "NUTRITION", false, false, 0L));
  categories.add(new PackingCategory("NUTRITION", "Nước uống & Dinh dưỡng", "Droplet", nutrition));

  // Category 5: Y tế & An toàn sinh tồn
  List<PackingItem> safety = new ArrayList<>();
  var headlampRent = rentalLookup.apply("đèn", 30000L);
  safety.add(new PackingItem("safe_headlamp", "Đèn pin đội đầu LED > 200 lumens + Pin dự phòng", "Bắt buộc có khi trekking xuyên đêm hoặc summit đỉnh lúc sáng sớm", "SAFETY", true, headlampRent[0] == 1L, headlampRent[1]));
  safety.add(new PackingItem("safe_meds", "Túi thuốc cá nhân: Hạ sốt, Berberin, giảm đau, Salonpas", "Xử lý nhanh chóng các triệu chứng phát sinh dọc đường", "SAFETY", true, false, 0L));
  safety.add(new PackingItem("safe_firstaid", "Băng dán cá nhân Urgo, gạc vô trùng, cồn đỏ, còi cứu hộ", "Còi sinh tồn không dùng bi (thổi được ngay cả khi ướt nước)", "SAFETY", true, false, 0L));
  if (isNorthMountain) {
   safety.add(new PackingItem("safe_heatpack", "Miếng dán giữ nhiệt (4-6 miếng)", "Dán bụng và gan bàn chân giữ ấm vào ban đêm", "SAFETY", false, false, 0L));
  } else {
   safety.add(new PackingItem("safe_repellent", "Thuốc bôi chống muỗi / Chai xịt côn trùng Soffell", "Chống côn trùng cắn khi cắm trại ven bìa rừng", "SAFETY", true, false, 0L));
  }
  categories.add(new PackingCategory("SAFETY", "Y tế & An toàn sinh tồn", "ShieldAlert", safety));

  // 5. Generate Dynamic Quick Pills
  List<String> pills = new ArrayList<>();
  if (isNorthMountain) {
   pills.add("So sánh " + displayName + " với Bạch Mộc Lương Tử");
   pills.add("Lịch trình chi tiết các ngày của " + displayName);
   pills.add("Người mới thể lực trung bình có đi được " + displayName + " không?");
  } else if (isSouthHills) {
   pills.add("So sánh " + displayName + " với Bidoup Núi Bà");
   pills.add("Mùa này " + displayName + " có suối lũ nguy hiểm không?");
   pills.add("Kinh nghiệm chuẩn bị nước uống khi đi " + displayName);
  } else {
   pills.add("So sánh cung " + displayName + " với tour khác");
   pills.add("Lịch trình chi tiết các ngày của tour này");
   pills.add("Chi phí tour và dịch vụ đưa đón trọn gói");
  }

  String title = "Hành trang chuẩn bị: " + displayName + " (" + days + "N" + (days > 1 ? (days - 1) + "Đ" : "") + " - Tháng " + month + ")";
  return new PackingCard(title, displayName, seasonNotice, temperatureRange, terrainNotice, categories, pills);
 }
}
