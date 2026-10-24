package com.trekkingcamping.backend.module.booking.service;

import com.trekkingcamping.backend.module.booking.entity.*;
import com.trekkingcamping.backend.module.booking.repository.*;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.notification.service.NotificationService;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class BookingChangeService {
 public record Create(String type,Long targetScheduleId,String reason,BigDecimal expectedAmount) {}
 public record Decision(String decision,String note) {}
 public record Queue(List<BookingChangeRequest> items,int page,int totalPages,long totalElements) {}
 private final BookingRepository bookings; private final BookingChangeRequestRepository requests;
 private final TourScheduleRepository schedules; private final PaymentTransactionRepository payments;
 private final UserRepository users; private final NotificationService notifications; private final EntityManager em;
 public BookingChangeService(BookingRepository b,BookingChangeRequestRepository r,TourScheduleRepository s,
   PaymentTransactionRepository p,UserRepository u,NotificationService n,EntityManager em) {
  bookings=b;requests=r;schedules=s;payments=p;users=u;notifications=n;this.em=em;
 }
 @Transactional(readOnly=true) public List<BookingChangeRequest> history(String email,Long id,boolean admin) {
  access(email,id,admin,false);return requests.findByBookingIdOrderByIdDesc(id);
 }
 @Transactional(readOnly=true) public Queue queue(String email,int page) {
  user(email,true);if(page<0||page>10000)throw bad("Trang không hợp lệ.");
  var result=requests.findByStatusOrderByIdDesc("PENDING",PageRequest.of(page,20));
  return new Queue(result.getContent(),page,result.getTotalPages(),result.getTotalElements());
 }
 @Transactional public BookingChangeRequest create(String email,Long id,Create input) {
  var b=access(email,id,false,true);active(b);
  if(input==null||!Set.of("CANCEL","RESCHEDULE").contains(Objects.toString(input.type(),"")))throw bad("Loại yêu cầu không hợp lệ.");
  String reason=text(input.reason());
  if(requests.existsByBookingIdAndStatus(id,"PENDING"))throw conflict("Đơn đã có yêu cầu chờ xử lý.");
  var r=new BookingChangeRequest();r.setBookingId(id);r.setOriginalScheduleId(b.getSchedule().getId());
  r.setType(input.type());r.setReason(reason);r.setStatus("PENDING");r.setCreatedAt(LocalDateTime.now());
  if("RESCHEDULE".equals(input.type())) {
   var target=target(b,input.targetScheduleId(),false);var amount=amount(b,target);
   if(input.expectedAmount()==null||amount.compareTo(input.expectedAmount())!=0)throw conflict("Giá đã thay đổi. Tải lại giá trước khi gửi yêu cầu.");
   r.setTargetScheduleId(target.getId());r.setQuotedAmount(amount);r.setTargetSnapshot(snapshot(target));
  } else if(input.targetScheduleId()!=null)throw bad("Yêu cầu hủy không có lịch thay thế.");
  requests.saveAndFlush(r);
  notifications.administrators(b,"CHANGE_REQUEST_"+r.getId(),"Có yêu cầu đổi lịch / hủy đơn");
  return r;
 }
 @Transactional public BookingChangeRequest decide(String email,Long bookingId,Long requestId,Decision input) {
  var b=access(email,bookingId,true,true);
  if(input==null||!Set.of("APPROVED","REJECTED").contains(Objects.toString(input.decision(),"")))throw bad("Quyết định không hợp lệ.");
  String note=text(input.note());
  var r=requests.findById(requestId).filter(x->Objects.equals(x.getBookingId(),bookingId)).orElseThrow(this::missing);
  em.refresh(r);
  if(!"PENDING".equals(r.getStatus())) {
   if(input.decision().equals(r.getStatus()))return r;
   throw conflict("Yêu cầu đã được xử lý.");
  }
  if("APPROVED".equals(input.decision())) {
   active(b);
   if(!Objects.equals(b.getSchedule().getId(),r.getOriginalScheduleId()))throw conflict("Lịch của đơn đã thay đổi.");
   var tx=payments.findByBookingIdOrderByIdDesc(bookingId);
   if(tx.stream().anyMatch(p->"PENDING".equals(p.getStatus())))throw conflict("Có giao dịch đang chờ kết quả. Đối soát trước khi duyệt.");
   if("CANCEL".equals(r.getType())) {
    var old=lockSchedule(b.getSchedule().getId());release(old,b.getNumberOfPax());
    tx.stream().filter(p->"SUCCESS".equals(p.getStatus())).forEach(p->{p.setStatus("REFUND_REQUIRED");payments.save(p);});
    b.setStatus("CANCELLED");
   } else {
    // A stable schedule lock order avoids opposing transfers deadlocking each other.
    long oldId=b.getSchedule().getId(),newId=r.getTargetScheduleId();
    var first=lockSchedule(Math.min(oldId,newId));var second=lockSchedule(Math.max(oldId,newId));
    var old=first.getId()==oldId?first:second;var next=first.getId()==newId?first:second;
    validateTarget(b,next);var total=amount(b,next);
    if(!Objects.equals(r.getTargetSnapshot(),snapshot(next)))throw conflict("Ngày hoặc điểm/giờ đón đã thay đổi. Khách cần gửi yêu cầu mới.");
    if(total.compareTo(r.getQuotedAmount())!=0)throw conflict("Giá đã thay đổi sau khi gửi yêu cầu. Từ chối và yêu cầu khách xác nhận giá mới.");
    if(tx.stream().anyMatch(p->"REFUND_REQUIRED".equals(p.getStatus())))throw conflict("Đơn đang cần xử lý hoàn tiền.");
    if(tx.stream().anyMatch(p->"SUCCESS".equals(p.getStatus()))&&total.compareTo(b.getTotalAmount())!=0)
     throw conflict("Đơn đã thanh toán có chênh lệch giá; cần đối soát riêng, chưa thể duyệt đổi lịch.");
    release(old,b.getNumberOfPax());next.setAvailableSlots(next.getAvailableSlots()-b.getNumberOfPax());
    if(next.getAvailableSlots()==0)next.setStatus("FULL");schedules.save(next);
    b.setSchedule(next);b.setTotalAmount(total);
    // Paid declarations are immutable in ParticipationService. Preserve their prior approval
    // for a same-tour transfer; unpaid bookings must acknowledge the changed departure.
    if(b.getParticipationStatus()!=null&&tx.stream().noneMatch(p->"SUCCESS".equals(p.getStatus()))) {
     b.setParticipationStatus("INCOMPLETE");
     b.setParticipationRevision(b.getParticipationRevision()==null?1:b.getParticipationRevision()+1);
     b.setStatus("PENDING");
    }
    if(b.getParticipationDeadline()!=null&&b.getParticipationDeadline().isAfter(next.getDepartureDate().atStartOfDay()))b.setParticipationDeadline(next.getDepartureDate().atStartOfDay());
    var declaration=em.find(ParticipationDeclaration.class,b.getId());
    if(declaration!=null)declaration.setPurgeAfter(next.getReturnDate().plusDays(31).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
   }
   b.setUpdatedAt(LocalDateTime.now());bookings.save(b);
  }
  r.setStatus(input.decision());r.setAdminNote(note);r.setReviewedBy(email);r.setReviewedAt(LocalDateTime.now());requests.save(r);
  notifications.booking(b,"CHANGE_"+r.getId(),"Yêu cầu đổi lịch / hủy đơn đã được xử lý",
   "APPROVED".equals(r.getStatus())?"Yêu cầu đã được duyệt. Kiểm tra lại lịch và khai báo tham gia. Tiền hoàn (nếu có) cần đối soát riêng; chưa xác nhận đã hoàn tiền.":"Yêu cầu bị từ chối. Xem lý do trong chi tiết đơn.");
  return r;
 }
 private com.trekkingcamping.backend.module.user.entity.User user(String email,boolean admin) {
  var u=users.findByEmail(email).filter(x->Boolean.TRUE.equals(x.getIsActive())).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  if(admin&&(u.getRole()==null||!"ROLE_ADMIN".equals(u.getRole().getName())))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  return u;
 }
 private Booking access(String email,Long id,boolean admin,boolean lock) {
  var u=user(email,admin);var b=(lock?bookings.findByIdForUpdate(id):bookings.findById(id)).orElseThrow(this::missing);
  if(lock)em.refresh(b);
  if(!admin&&!Objects.equals(b.getUser().getId(),u.getId()))throw missing();return b;
 }
 private void active(Booking b) {
  if(!Set.of("PENDING","CONFIRMED").contains(b.getStatus())||b.getSchedule().getDepartureDate()==null||!b.getSchedule().getDepartureDate().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))))
   throw conflict("Chỉ xử lý đơn còn hiệu lực trước ngày khởi hành.");
  if(b.getNumberOfPax()==null||b.getNumberOfPax()<=0)throw conflict("Số khách không hợp lệ.");
 }
 private TourSchedule target(Booking b,Long id,boolean lock) {
  if(id==null)throw bad("Chọn lịch muốn đổi.");
  var s=(lock?schedules.findByIdForUpdate(id):schedules.findById(id)).orElseThrow(this::missing);validateTarget(b,s);return s;
 }
 private void validateTarget(Booking b,TourSchedule s) {
  if(Objects.equals(s.getId(),b.getSchedule().getId())||!Objects.equals(s.getTour().getId(),b.getSchedule().getTour().getId()))throw bad("Chọn lịch khác của cùng tour.");
  if(!Boolean.TRUE.equals(s.getTour().getIsActive())||!"OPEN".equals(s.getStatus())||s.getDepartureDate()==null||s.getReturnDate()==null||s.getReturnDate().isBefore(s.getDepartureDate())||!s.getDepartureDate().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))||s.getAvailableSlots()==null||s.getAvailableSlots()<b.getNumberOfPax())throw conflict("Lịch mới không còn khả dụng hoặc không đủ chỗ.");
 }
 private String snapshot(TourSchedule s){return s.getDepartureDate()+" → "+s.getReturnDate()+" | "+Objects.toString(s.getPickupAt(),"")+" | "+Objects.toString(s.getPickupPoint(),"");}
 private BigDecimal amount(Booking b,TourSchedule s) {
  var price=s.getTour().getPricePerPax();if(price==null||price.signum()<0)throw conflict("Giá tour không hợp lệ.");return price.multiply(BigDecimal.valueOf(b.getNumberOfPax()));
 }
 private TourSchedule lockSchedule(Long id) {var s=schedules.findByIdForUpdate(id).orElseThrow(this::missing);em.refresh(s);return s;}
 private void release(TourSchedule s,int pax) {
  if(s.getAvailableSlots()==null)throw conflict("Dữ liệu chỗ trống không hợp lệ.");
  s.setAvailableSlots(Math.addExact(s.getAvailableSlots(),pax));if("FULL".equals(s.getStatus()))s.setStatus("OPEN");schedules.save(s);
 }
 private String text(String value){if(value==null||value.isBlank()||value.trim().length()>1000)throw bad("Nhập lý do từ 1 đến 1000 ký tự.");return value.trim();}
 private ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy đơn hoặc yêu cầu.");}
 private ResponseStatusException bad(String m){return new ResponseStatusException(HttpStatus.BAD_REQUEST,m);}
 private ResponseStatusException conflict(String m){return new ResponseStatusException(HttpStatus.CONFLICT,m);}
}
