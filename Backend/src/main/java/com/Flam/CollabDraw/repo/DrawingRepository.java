package com.Flam.CollabDraw.repo;

import com.Flam.CollabDraw.model.DrawAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface DrawingRepository extends JpaRepository<DrawAction, Long> {

    @Transactional
    @Modifying
    @Query("DELETE FROM DrawAction d WHERE d.userId = :userId")
    void deleteByUserId(@Param("userId") String userId);

    // Returns all points ordered by time (ID) for perfect reconstruction
    List<DrawAction> findAllByOrderByIdAsc();
}
