package com.trekkingcamping.backend.module.guide.dto;
import com.trekkingcamping.backend.module.guide.entity.Guide;
import java.time.LocalDate;
import java.util.List;
public final class GuideDtos {
    private GuideDtos() {}
    public record Edit(String code, String fullName, String bio, Integer experienceSince,
                       String specialties, String languages, String phone, String email, Boolean active) {}
    public record PublicProfile(Long id, String code, String fullName, String avatarUrl, String bio,
                                Integer experienceSince, String specialties, String languages) {
        public static PublicProfile from(Guide g) { return new PublicProfile(g.getId(), g.getCode(), g.getFullName(), g.getAvatarUrl(), g.getBio(), g.getExperienceSince(), g.getSpecialties(), g.getLanguages()); }
    }
    public record AdminProfile(PublicProfile profile, String phone, String email, boolean active,boolean accountLinked) {
        public AdminProfile(PublicProfile profile,String phone,String email,boolean active){this(profile,phone,email,active,false);}
        public static AdminProfile from(Guide g) { return new AdminProfile(PublicProfile.from(g), g.getPhone(), g.getEmail(), g.getActive(),g.getUser()!=null&&Boolean.TRUE.equals(g.getUser().getIsActive())&&g.getUser().getRole()!=null&&"ROLE_GUIDE".equals(g.getUser().getRole().getName())); }
    }
    public record Assignment(String guideCode, String role) {}
    public record Member(PublicProfile guide, String role, String responseStatus, String responseReason, boolean accountLinked) {
        public Member(PublicProfile guide,String role) { this(guide,role,"LEGACY",null,false); }
    }
    public record Schedule(Long id, LocalDate departureDate, LocalDate returnDate, Integer availableSlots,
                           String status, String guideName, List<Member> guides,java.time.LocalDateTime pickupAt,String pickupPoint) {}
    public record Team(List<Member> guides, String legacyGuideName, String legacyGuidePhone) {}
    public record Contact(PublicProfile guide, String role, String phone) {}
    public record BookingTeam(List<Contact> guides, String legacyGuideName, String legacyGuidePhone) {}
}

