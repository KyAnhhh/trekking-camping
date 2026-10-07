package com.trekkingcamping.backend.module.tour.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "tour_gears")
public class TourGear {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "tour_id")
    private Tour tour;

    @Column(name = "gear_name")
    private String gearName;

    @Column(name = "is_provided")
    private Boolean isProvided = true;

    @Column(name = "rental_price")
    private BigDecimal rentalPrice = BigDecimal.ZERO;

    public TourGear() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Tour getTour() { return tour; }
    public void setTour(Tour tour) { this.tour = tour; }
    public String getGearName() { return gearName; }
    public void setGearName(String gearName) { this.gearName = gearName; }
    public Boolean getIsProvided() { return isProvided; }
    public void setIsProvided(Boolean isProvided) { this.isProvided = isProvided; }
    public BigDecimal getRentalPrice() { return rentalPrice; }
    public void setRentalPrice(BigDecimal rentalPrice) { this.rentalPrice = rentalPrice; }
}