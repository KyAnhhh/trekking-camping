package com.trekkingcamping.backend.common.exception;

import com.trekkingcamping.backend.common.dto.ApiResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleStatus(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(
                new ApiResponse<>(exception.getStatusCode().value(), exception.getReason(), null));
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResponse<Void>> handleInvalidRequest(Exception exception) {
        String message = exception instanceof IllegalArgumentException
                ? exception.getMessage() : "Dữ liệu yêu cầu không hợp lệ.";
        return ResponseEntity.badRequest().body(new ApiResponse<>(400, message, null));
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleUploadSize(Exception exception) {
        return ResponseEntity.status(413).body(new ApiResponse<>(413, "File vượt quá dung lượng cho phép. Ảnh tối đa 5 MB; tài liệu và file import tối đa 1 MB.", null));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConflict(DataIntegrityViolationException exception) {
        return ResponseEntity.status(409).body(new ApiResponse<>(409, "Dữ liệu đã tồn tại hoặc không còn hợp lệ.", null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception exception) {
        return ResponseEntity.internalServerError().body(
                new ApiResponse<>(500, "Không thể xử lý yêu cầu. Vui lòng thử lại sau.", null));
    }
}
