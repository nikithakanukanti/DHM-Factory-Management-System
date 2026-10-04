package com.dhm.backend.repository;

import com.dhm.backend.entity.ReactorTiming;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReactorTimingRepository
        extends JpaRepository<ReactorTiming, Long> {
}
