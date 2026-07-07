package com.gov.subsidy.mapper;

import com.gov.subsidy.dto.UserCreateDto;
import com.gov.subsidy.dto.UserDto;
import com.gov.subsidy.entity.Role;
import com.gov.subsidy.entity.User;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.stream.Collectors;

@Component
public class UserMapper implements GenericMapper<User, UserDto> {

    @Override
    public UserDto toDto(User entity) {
        if (entity == null) {
            return null;
        }

        return UserDto.builder()
                .id(entity.getId())
                .username(entity.getUsername())
                .email(entity.getEmail())
                .firstName(entity.getFirstName())
                .lastName(entity.getLastName())
                .active(entity.isActive())
                .roles(entity.getRoles() == null ? Collections.emptySet() : 
                        entity.getRoles().stream()
                                .map(role -> role.getName().name())
                                .collect(Collectors.toSet()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }

    @Override
    public User toEntity(UserDto dto) {
        if (dto == null) {
            return null;
        }

        User user = User.builder()
                .id(dto.getId())
                .username(dto.getUsername())
                .email(dto.getEmail())
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .active(dto.isActive())
                .build();
        
        user.setCreatedAt(dto.getCreatedAt());
        user.setUpdatedAt(dto.getUpdatedAt());
        user.setCreatedBy(dto.getCreatedBy());
        user.setUpdatedBy(dto.getUpdatedBy());
        return user;
    }

    public User toEntity(UserCreateDto createDto) {
        if (createDto == null) {
            return null;
        }

        return User.builder()
                .username(createDto.getUsername())
                .password(createDto.getPassword())
                .email(createDto.getEmail())
                .firstName(createDto.getFirstName())
                .lastName(createDto.getLastName())
                .active(true)
                .build();
    }
}
