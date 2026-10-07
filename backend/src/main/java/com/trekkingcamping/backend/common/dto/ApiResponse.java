package com.trekkingcamping.backend.common.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter 
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private int code = 1000;
    private String message = "success";
    private T data;

    // Tự viết hàm setData bằng Java thuần để đè lên Lombok, VS Code sẽ hết gạch đỏ lập tức!
    public void setData(T data) {
        this.data = data;
    }

    public T getData() {
        return data;
    }
}