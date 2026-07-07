package com.gov.subsidy.repository;

import com.gov.subsidy.entity.Role;
import com.gov.subsidy.enums.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    
    Optional<Role> findByName(RoleType name);
}
