package com.trekkingcamping.backend.module.guide.entity;
import jakarta.persistence.*;
@Entity
@Table(name = "guides")
public class Guide {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 40)
    private String code;
    @Column(nullable = false, length = 150)
    private String fullName;
    
    private String avatarUrl;
    @Column(length = 4000)
    private String bio;
    
    private Integer experienceSince;
    @Column(length = 500)
    private String specialties;
    @Column(length = 200)
    private String languages;
    @Column(length = 30)
    private String phone;
    @Column(length = 254)
    private String email;
    
    @Column(nullable = false)
    private boolean active = true;
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String value) { this.code = value; }
    public String getFullName() { return fullName; }
    public void setFullName(String value) { this.fullName = value; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String value) { this.avatarUrl = value; }
    public String getBio() { return bio; }
    public void setBio(String value) { this.bio = value; }
    public Integer getExperienceSince() { return experienceSince; }
    public void setExperienceSince(Integer value) { this.experienceSince = value; }
    public String getSpecialties() { return specialties; }
    public void setSpecialties(String value) { this.specialties = value; }
    public String getLanguages() { return languages; }
    public void setLanguages(String value) { this.languages = value; }
    public String getPhone() { return phone; }
    public void setPhone(String value) { this.phone = value; }
    public String getEmail() { return email; }
    public void setEmail(String value) { this.email = value; }
    public boolean getActive() { return active; }
    public void setActive(boolean value) { this.active = value; }
}

