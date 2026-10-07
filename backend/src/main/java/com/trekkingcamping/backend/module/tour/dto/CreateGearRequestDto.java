package com.trekkingcamping.backend.module.tour.dto;

import java.math.BigDecimal;

public class CreateGearRequestDto {
    private String gearName;
    private Boolean isProvided;
    private BigDecimal rentalPrice;

    public CreateGearRequestDto() {}

    public String getGearName() { return gearName; }
    public void setGearName(String gearName) { this.gearName = gearName; }
    public Boolean getIsProvided() { return isProvided; }
    public void setIsProvided(Boolean isProvided) { this.isProvided = isProvided; }
    public BigDecimal getRentalPrice() { return rentalPrice; }
    public void setRentalPrice(BigDecimal rentalPrice) { this.rentalPrice = rentalPrice; }
}