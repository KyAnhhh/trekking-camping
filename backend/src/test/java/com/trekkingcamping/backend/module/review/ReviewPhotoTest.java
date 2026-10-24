package com.trekkingcamping.backend.module.review;
import com.trekkingcamping.backend.module.review.service.ReviewPhotoService;
import com.trekkingcamping.backend.module.review.repository.TourReviewRepository;
import com.trekkingcamping.backend.module.review.entity.TourReview;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import com.trekkingcamping.backend.module.user.entity.*;
import com.trekkingcamping.backend.module.tour.entity.*;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.io.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ReviewPhotoTest {
 @TempDir Path directory;TourReviewRepository reviews=mock(TourReviewRepository.class);UserRepository users=mock(UserRepository.class);JdbcTemplate jdbc=mock(JdbcTemplate.class);ReviewPhotoService service;TourReview r;Tour tour;
 @BeforeEach void setup(){service=new ReviewPhotoService(reviews,users,jdbc,directory.toString());var u=new User();u.setEmail("owner");tour=new Tour();tour.setIsActive(true);r=new TourReview();r.setUser(u);r.setTour(tour);r.setIsApproved(true);var b=new Booking();b.setStatus("COMPLETED");var s=new TourSchedule();s.setReturnDate(LocalDate.now().minusDays(2));b.setSchedule(s);r.setBooking(b);when(reviews.findById(1L)).thenReturn(Optional.of(r));when(reviews.locked(1L)).thenReturn(Optional.of(r));}
 @Test void privateListIsNotPublic(){assertThrows(ResponseStatusException.class,()->service.list(1L,null,true));assertThrows(ResponseStatusException.class,()->service.list(1L,"stranger",true));}
 @Test void publicListOnlyApprovedPhotos(){service.list(1L,null,false);verify(jdbc).queryForList(contains("AND approved=true"),eq(1L));}
 @Test void hiddenReviewOrInactiveTourBlocksPublic(){r.setIsApproved(false);assertThrows(ResponseStatusException.class,()->service.list(1L,null,false));r.setIsApproved(true);tour.setIsActive(false);assertThrows(ResponseStatusException.class,()->service.list(1L,null,false));}
 @Test void cannotUploadToOtherReview(){assertThrows(ResponseStatusException.class,()->service.upload(1L,"stranger",new MockMultipartFile("file",new byte[]{1})));}
 @Test void unfinishedTripCannotUpload(){r.getBooking().setStatus("CONFIRMED");assertThrows(ResponseStatusException.class,()->service.upload(1L,"owner",new MockMultipartFile("file",new byte[]{1})));}
 @Test void fiveImageLimit(){when(jdbc.queryForObject(anyString(),eq(Long.class),eq(1L))).thenReturn(5L);assertThrows(IllegalArgumentException.class,()->service.upload(1L,"owner",new MockMultipartFile("file",new byte[]{1})));}
 @Test void invalidContentRejectedDespiteMime(){when(jdbc.queryForObject(anyString(),eq(Long.class),eq(1L))).thenReturn(0L);assertThrows(IllegalArgumentException.class,()->service.upload(1L,"owner",new MockMultipartFile("file","fake.png","image/png","not an image".getBytes())));}
 @Test void reencodesAndDeletesOnRollback()throws Exception{when(jdbc.queryForObject(anyString(),eq(Long.class),eq(1L))).thenReturn(0L);var bytes=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(2,2,BufferedImage.TYPE_INT_RGB),"png",bytes);TransactionSynchronizationManager.initSynchronization();try{service.upload(1L,"owner",new MockMultipartFile("file","x.png","image/png",bytes.toByteArray()));try(var files=Files.list(directory)){assertEquals(1,files.count());}for(var sync:TransactionSynchronizationManager.getSynchronizations())sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);try(var files=Files.list(directory)){assertEquals(0,files.count());}}finally{TransactionSynchronizationManager.clearSynchronization();}}
 @Test void customerCannotModerate(){assertThrows(ResponseStatusException.class,()->service.moderate(1L,2L,"owner",true));}
 @Test void unapprovedMediaDeniedBeforeFileRead(){when(jdbc.queryForList(anyString(),any(Object.class))).thenReturn(List.of(Map.of("review_id",1L,"approved",false)));assertThrows(ResponseStatusException.class,()->service.read("x.jpg",null));}
}
