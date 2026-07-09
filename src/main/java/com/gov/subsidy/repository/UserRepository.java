package com.gov.subsidy.repository;

import com.gov.subsidy.entity.User;
import com.gov.subsidy.enums.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    /**
     * Find all active users that have the specified role.
     * Used by the routing engine to locate eligible officers for assignment.
     *
     * @param roleName the RoleType to filter by
     * @return list of active users holding that role
     */
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.active = true")
    List<User> findActiveUsersByRole(@Param("roleName") RoleType roleName);

    /**
     * Find the active user with the specified role who has the fewest current application
     * assignments (load-balancing). Used for auto-assignment in the routing engine.
     *
     * @param roleName the RoleType to filter by
     * @return the least-loaded active officer, or empty if none available
     */
    @Query("""
            SELECT u FROM User u JOIN u.roles r
            WHERE r.name = :roleName AND u.active = true
            ORDER BY (
                SELECT COUNT(a) FROM Application a WHERE a.assignedOfficer = u
            ) ASC
            """)
    List<User> findLeastLoadedActiveUsersByRole(@Param("roleName") RoleType roleName);
}

