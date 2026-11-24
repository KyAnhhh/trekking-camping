package com.trekkingcamping.backend.module.booking.service;

import com.trekkingcamping.backend.module.booking.dto.CertificateDto;
import com.trekkingcamping.backend.module.booking.entity.Booking;
import com.trekkingcamping.backend.module.booking.entity.BookingPassenger;
import com.trekkingcamping.backend.module.booking.repository.BookingPassengerRepository;
import com.trekkingcamping.backend.module.booking.repository.BookingRepository;
import com.trekkingcamping.backend.module.guide.repository.ScheduleGuideRepository;
import com.trekkingcamping.backend.module.tour.entity.AdventureProfile;
import com.trekkingcamping.backend.module.tour.entity.Tour;
import com.trekkingcamping.backend.module.user.entity.User;
import com.trekkingcamping.backend.module.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CertificateService {

    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository passengerRepository;
    private final ScheduleGuideRepository scheduleGuideRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Pattern CERT_PATTERN = Pattern.compile("TC-CERT-\\d{4}-([A-Za-z0-9_-]+)-(\\d{1,3})", Pattern.CASE_INSENSITIVE);

    public CertificateService(
            BookingRepository bookingRepository,
            BookingPassengerRepository passengerRepository,
            ScheduleGuideRepository scheduleGuideRepository,
            UserRepository userRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.passengerRepository = passengerRepository;
        this.scheduleGuideRepository = scheduleGuideRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<CertificateDto> getCertificatesForBooking(String email, Long bookingId, boolean admin) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn đặt tour."));

        if (!admin) {
            boolean isOwner = booking.getUser() != null && email.equalsIgnoreCase(booking.getUser().getEmail());
            boolean isContact = booking.getContactEmail() != null && email.equalsIgnoreCase(booking.getContactEmail());
            if (!isOwner && !isContact) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem chứng nhận của đơn đặt này.");
            }
        }

        boolean isCompleted = "COMPLETED".equalsIgnoreCase(booking.getStatus());
        boolean isPastTour = "CONFIRMED".equalsIgnoreCase(booking.getStatus())
                && booking.getSchedule() != null
                && booking.getSchedule().getReturnDate() != null
                && booking.getSchedule().getReturnDate().isBefore(LocalDate.now().plusDays(1));
        boolean eligible = isCompleted || isPastTour || admin;

        String leadGuide = resolveLeadGuide(booking);
        List<BookingPassenger> passengers = passengerRepository.findByBookingIdOrderByPositionAsc(bookingId);

        List<CertificateDto> result = new ArrayList<>();
        if (passengers.isEmpty()) {
            result.add(buildCertificate(booking, null, 1, leadGuide, eligible));
        } else {
            for (int i = 0; i < passengers.size(); i++) {
                BookingPassenger p = passengers.get(i);
                int pos = p.getPosition() > 0 ? p.getPosition() : (i + 1);
                result.add(buildCertificate(booking, p, pos, leadGuide, eligible));
            }
        }
        return result;
    }

    @Transactional(readOnly = true)
    public CertificateDto verifyCertificate(String certificateCode) {
        if (certificateCode == null || certificateCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã giấy chứng nhận không hợp lệ.");
        }

        Matcher matcher = CERT_PATTERN.matcher(certificateCode.trim());
        String bookingCode;
        int targetPosition = 1;

        if (matcher.matches()) {
            bookingCode = matcher.group(1);
            try {
                targetPosition = Integer.parseInt(matcher.group(2));
            } catch (NumberFormatException ignored) {}
        } else {
            bookingCode = certificateCode.trim();
        }

        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chứng nhận tương ứng với mã: " + certificateCode));

        String leadGuide = resolveLeadGuide(booking);
        List<BookingPassenger> passengers = passengerRepository.findByBookingIdOrderByPositionAsc(booking.getId());

        BookingPassenger matched = null;
        for (BookingPassenger p : passengers) {
            if (p.getPosition() == targetPosition) {
                matched = p;
                break;
            }
        }
        if (matched == null && !passengers.isEmpty()) {
            matched = passengers.get(0);
        }

        boolean isCompleted = "COMPLETED".equalsIgnoreCase(booking.getStatus());
        boolean isPastTour = "CONFIRMED".equalsIgnoreCase(booking.getStatus())
                && booking.getSchedule() != null
                && booking.getSchedule().getReturnDate() != null
                && booking.getSchedule().getReturnDate().isBefore(LocalDate.now().plusDays(1));
        boolean eligible = isCompleted || isPastTour;

        return buildCertificate(booking, matched, targetPosition, leadGuide, eligible);
    }

    private String resolveLeadGuide(Booking booking) {
        if (booking.getSchedule() != null) {
            try {
                var guides = scheduleGuideRepository.forSchedules(List.of(booking.getSchedule().getId()));
                if (!guides.isEmpty() && guides.get(0).getGuide() != null) {
                    var g = guides.get(0).getGuide();
                    if (g.getFullName() != null && !g.getFullName().isBlank()) {
                        return g.getFullName() + " (Trưởng đoàn)";
                    } else if (g.getUser() != null && g.getUser().getFullName() != null) {
                        return g.getUser().getFullName() + " (Trưởng đoàn)";
                    }
                }
            } catch (Exception ignored) {}
        }
        return "Nguyễn Hoàng Nam (Trưởng đoàn Trek & Camp)";
    }

    private CertificateDto buildCertificate(Booking b, BookingPassenger p, int position, String leadGuide, boolean eligible) {
        Tour tour = b.getSchedule() != null ? b.getSchedule().getTour() : null;
        AdventureProfile profile = tour != null ? tour.getAdventureProfile() : null;

        String recipient = (p != null && p.getFullName() != null && !p.getFullName().isBlank())
                ? p.getFullName()
                : (b.getContactName() != null ? b.getContactName() : "Du khách Trek & Camp");
        if (p != null && (p.getFullName() == null || p.getFullName().isBlank()) && position > 1) {
            recipient += " (Thành viên " + position + ")";
        }

        int year = b.getSchedule() != null && b.getSchedule().getDepartureDate() != null
                ? b.getSchedule().getDepartureDate().getYear()
                : LocalDate.now().getYear();

        String certCode = String.format("TC-CERT-%d-%s-%02d", year, b.getBookingCode(), position);

        int diff = tour != null && tour.getDifficultyLevel() != null ? tour.getDifficultyLevel() : 2;
        int alt = profile != null && profile.getMaxAltitudeM() != null ? profile.getMaxAltitudeM() : 1500;

        String badgeRank = "BRONZE";
        String badgeTitle = "Huy hiệu Đồng Khám phá Thiên nhiên (Bronze Nature Explorer)";
        if (diff >= 4 || alt >= 2800) {
            badgeRank = "GOLD";
            badgeTitle = "Huy hiệu Vàng Chinh phục Đỉnh cao (Gold Summit Conqueror)";
        } else if (diff >= 2 || alt >= 1500) {
            badgeRank = "SILVER";
            badgeTitle = "Huy hiệu Bạc Tiên phong Băng rừng (Silver Trail Pioneer)";
        }

        LocalDate returnDate = b.getSchedule() != null ? b.getSchedule().getReturnDate() : LocalDate.now();
        String issuedDate = returnDate != null ? returnDate.format(DATE_FMT) : LocalDate.now().format(DATE_FMT);

        return CertificateDto.builder()
                .certificateCode(certCode)
                .bookingId(b.getId())
                .bookingCode(b.getBookingCode())
                .passengerId(p != null ? p.getId() : null)
                .position(position)
                .recipientName(recipient)
                .tourTitle(tour != null ? tour.getTitle() : "Chuyến thám hiểm Trek & Camp")
                .destination(tour != null ? tour.getLocation() : "Việt Nam")
                .departureDate(b.getSchedule() != null ? b.getSchedule().getDepartureDate() : null)
                .returnDate(b.getSchedule() != null ? b.getSchedule().getReturnDate() : null)
                .durationDays(tour != null ? tour.getDurationDays() : 2)
                .durationNights(tour != null ? tour.getDurationNights() : 1)
                .distanceKm(profile != null ? profile.getDistanceKm() : null)
                .maxAltitudeM(profile != null ? profile.getMaxAltitudeM() : null)
                .totalAscentM(profile != null ? profile.getTotalAscentM() : null)
                .difficultyLevel(diff)
                .badgeRank(badgeRank)
                .badgeTitle(badgeTitle)
                .leadGuideName(leadGuide)
                .issuedDate(issuedDate)
                .verificationUrl("https://trekandcamp.com/certificate/verify/" + certCode)
                .eligible(eligible)
                .build();
    }
}
