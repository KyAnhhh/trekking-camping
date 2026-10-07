package com.trekkingcamping.backend.module.booking.service;

import com.trekkingcamping.backend.module.booking.dto.BookingRequestDto;
import com.trekkingcamping.backend.module.booking.dto.BookingResponseDto;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.tour.entity.TourSchedule;
import com.trekkingcamping.backend.module.tour.repository.TourScheduleRepository;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final TourScheduleRepository scheduleRepository;
    private final UserRepository userRepository;

    public BookingService(BookingRepository bookingRepository, TourScheduleRepository scheduleRepository, UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.scheduleRepository = scheduleRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public BookingResponseDto createBooking(String email, BookingRequestDto dto) {
        User user = requireUser(email);
        if (dto.getScheduleId() == null || dto.getScheduleId() <= 0
                || dto.getNumberOfPax() == null || dto.getNumberOfPax() <= 0) {
            throw new IllegalArgumentException("Vui lòng chọn lịch khởi hành và số người hợp lệ.");
        }
        if (dto.getContactName() == null || dto.getContactName().isBlank()
                || dto.getContactPhone() == null || !dto.getContactPhone().matches("[+0-9 ()-]{8,20}")
                || dto.getContactEmail() == null || !dto.getContactEmail().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            throw new IllegalArgumentException("Vui lòng nhập họ tên, email và số điện thoại liên hệ hợp lệ.");
        }

        TourSchedule schedule = scheduleRepository.findByIdForUpdate(dto.getScheduleId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lịch khởi hành không tồn tại."));

        if (!"OPEN".equals(schedule.getStatus()) || !Boolean.TRUE.equals(schedule.getTour().getIsActive())
                || schedule.getDepartureDate() == null
                || !schedule.getDepartureDate().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Lịch khởi hành không còn nhận đặt chỗ.");
        }
        if (schedule.getTour().getPricePerPax() == null || schedule.getTour().getPricePerPax().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tour chưa có giá hợp lệ.");
        }

        if (schedule.getAvailableSlots() == null || schedule.getAvailableSlots() < dto.getNumberOfPax()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số chỗ trống còn lại không đủ!");
        }

        // Trừ chỗ trống khả dụng
        schedule.setAvailableSlots(schedule.getAvailableSlots() - dto.getNumberOfPax());
        if (schedule.getAvailableSlots() == 0) schedule.setStatus("FULL");
        scheduleRepository.save(schedule);

        // Tính tổng tiền = Số người * Đơn giá Tour
        BigDecimal totalAmount = schedule.getTour().getPricePerPax()
                .multiply(BigDecimal.valueOf(dto.getNumberOfPax()));

        // Tạo mã đặt tour ngẫu nhiên dạng: BK-8F3A2B1C
        String bookingCode = "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .user(user)
                .schedule(schedule)
                .numberOfPax(dto.getNumberOfPax())
                .totalAmount(totalAmount)
                .contactName(dto.getContactName())
                .contactEmail(dto.getContactEmail())
                .contactPhone(dto.getContactPhone())
                .medicalConditions(dto.getMedicalConditions())
                .emergencyContactName(dto.getEmergencyContactName())
                .emergencyContactPhone(dto.getEmergencyContactPhone())
                .specialRequirements(dto.getSpecialRequirements())
                .status("PENDING") // PENDING -> CONFIRMED / CANCELLED
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return BookingResponseDto.from(bookingRepository.save(booking));
    }

    @Transactional(readOnly = true)
    public List<BookingResponseDto> getUserBookings(String email) {
        User user = requireUser(email);
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(BookingResponseDto::from).toList();
    }

    private User requireUser(String email) {
        if (email == null || email.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập.");
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại."));
        if (!Boolean.TRUE.equals(user.getIsActive())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa.");
        return user;
    }
}
