package com.trekkingcamping.backend.module.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name="ai_configuration") @Getter @Setter
public class AiConfiguration {
    @Id private Integer id;
    private long revision;
    @Column(nullable=false,columnDefinition="TEXT") private String document;
}
