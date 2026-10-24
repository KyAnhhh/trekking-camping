package com.trekkingcamping.backend.module.review.service;
import com.trekkingcamping.backend.module.review.repository.TourReviewRepository;
import com.trekkingcamping.backend.module.review.entity.TourReview;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.tour.service.TourImageStorage;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.io.IOException;
import java.time.*;
@Service
public class ReviewPhotoService {
 private final TourReviewRepository reviews;private final UserRepository users;private final JdbcTemplate jdbc;private final TourImageStorage storage;
 public ReviewPhotoService(TourReviewRepository r,UserRepository u,JdbcTemplate j,@Value("${REVIEW_UPLOAD_DIR:uploads/reviews}") String directory){reviews=r;users=u;jdbc=j;storage=new TourImageStorage(directory,"/api/media/reviews/");}
 @Transactional(readOnly=true) public List<Map<String,Object>> list(Long reviewId,String email,boolean privateView){
  var r=reviews.findById(reviewId).orElseThrow(this::missing);
  if(privateView){if(!owner(r,email)&&!admin(email))throw missing();}else if(!visible(r))throw missing();
  return jdbc.queryForList("SELECT id,url,approved FROM review_photos WHERE review_id=?"+(privateView?"":" AND approved=true")+" ORDER BY id",reviewId);
 }
 @Transactional(rollbackFor=IOException.class) public void upload(Long reviewId,String email,MultipartFile file)throws IOException {
  var r=reviews.locked(reviewId).orElseThrow(this::missing);
  if(!owner(r,email))throw missing();
  if(r.getBooking()==null||!"COMPLETED".equals(r.getBooking().getStatus())||r.getBooking().getSchedule().getReturnDate()==null||!r.getBooking().getSchedule().getReturnDate().isBefore(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))))throw new ResponseStatusException(HttpStatus.CONFLICT,"Chỉ gửi ảnh từ chuyến đi đã hoàn thành.");
  if(jdbc.queryForObject("SELECT count(*) FROM review_photos WHERE review_id=?",Long.class,reviewId)>=5)throw new IllegalArgumentException("Tối đa 5 ảnh cho mỗi đánh giá.");
  String url=storage.save(file);
  TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)storage.remove(url);}});
  jdbc.update("INSERT INTO review_photos(review_id,url,approved) VALUES(?,?,false)",reviewId,url);
 }
 @Transactional public void moderate(Long reviewId,Long photoId,String email,Boolean approved){
  if(!admin(email))throw new ResponseStatusException(HttpStatus.FORBIDDEN);if(approved==null)throw new IllegalArgumentException("Thiếu trạng thái duyệt.");
  reviews.locked(reviewId).orElseThrow(this::missing);
  if(jdbc.update("UPDATE review_photos SET approved=? WHERE id=? AND review_id=?",approved,photoId,reviewId)!=1)throw missing();
 }
 @Transactional public void remove(Long reviewId,Long photoId,String email){
  var r=reviews.locked(reviewId).orElseThrow(this::missing);if(!owner(r,email))throw missing();
  var urls=jdbc.queryForList("DELETE FROM review_photos WHERE id=? AND review_id=? RETURNING url",String.class,photoId,reviewId);
  TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){urls.forEach(storage::remove);}});
 }
 @Transactional(readOnly=true) public Resource read(String name,String email){
  var rows=jdbc.queryForList("SELECT review_id,approved FROM review_photos WHERE url=?","/api/media/reviews/"+name);if(rows.isEmpty())throw missing();
  var row=rows.getFirst();var r=reviews.findById(((Number)row.get("review_id")).longValue()).orElseThrow(this::missing);
  if(!(Boolean.TRUE.equals(row.get("approved"))&&visible(r))&&!owner(r,email)&&!admin(email))throw missing();
  return storage.read(name);
 }
 private boolean visible(TourReview r){return Boolean.TRUE.equals(r.getIsApproved())&&Boolean.TRUE.equals(r.getTour().getIsActive());}
 private boolean owner(TourReview r,String email){return email!=null&&r.getUser()!=null&&email.equals(r.getUser().getEmail());}
 private boolean admin(String email){return email!=null&&users.findByEmail(email).filter(u->Boolean.TRUE.equals(u.getIsActive())&&u.getRole()!=null&&"ROLE_ADMIN".equals(u.getRole().getName())).isPresent();}
 private ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy ảnh đánh giá.");}
}
