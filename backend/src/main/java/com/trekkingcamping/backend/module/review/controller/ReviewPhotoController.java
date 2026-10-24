package com.trekkingcamping.backend.module.review.controller;
import com.trekkingcamping.backend.common.dto.ApiResponse;
import com.trekkingcamping.backend.module.review.service.ReviewPhotoService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import org.springframework.core.io.Resource;
import java.io.IOException;
@RestController
public class ReviewPhotoController {
 public record Approval(Boolean approved) {}
 private final ReviewPhotoService service;public ReviewPhotoController(ReviewPhotoService s){service=s;}
 @GetMapping("/api/reviews/{id}/photos") public ApiResponse<?> list(@PathVariable Long id){return ok(service.list(id,null,false));}
 @GetMapping("/api/me/reviews/{id}/photos") public ApiResponse<?> mine(@PathVariable Long id,@AuthenticationPrincipal String e){return ok(service.list(id,e,true));}
 @GetMapping("/api/admin/reviews/{id}/photos") public ApiResponse<?> admin(@PathVariable Long id,@AuthenticationPrincipal String e){return ok(service.list(id,e,true));}
 @PostMapping("/api/me/reviews/{id}/photos") public ApiResponse<?> upload(@PathVariable Long id,@AuthenticationPrincipal String e,@RequestParam MultipartFile file)throws IOException{service.upload(id,e,file);return ok(null);}
 @DeleteMapping("/api/me/reviews/{id}/photos/{photo}") public ApiResponse<?> remove(@PathVariable Long id,@PathVariable Long photo,@AuthenticationPrincipal String e){service.remove(id,photo,e);return ok(null);}
 @PutMapping("/api/admin/reviews/{id}/photos/{photo}") public ApiResponse<?> moderate(@PathVariable Long id,@PathVariable Long photo,@AuthenticationPrincipal String e,@RequestBody Approval body){service.moderate(id,photo,e,body.approved());return ok(null);}
 @GetMapping("/api/media/reviews/{name}") public ResponseEntity<Resource> media(@PathVariable String name,@AuthenticationPrincipal String e){return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").body(service.read(name,e));}
 private ApiResponse<?> ok(Object d){return new ApiResponse<>(1000,"Thành công",d);}
}
