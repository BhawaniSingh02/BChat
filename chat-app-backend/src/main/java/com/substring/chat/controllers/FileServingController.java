package com.substring.chat.controllers;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Serves locally stored files uploaded via LocalFileStorageService.
 * Only used in development when Cloudinary is not configured.
 * In production, files are served directly from Cloudinary CDN.
 */
@RestController
@RequestMapping("/api/v1/files")
@Slf4j
public class FileServingController {

    private static final Path UPLOAD_DIR = Paths.get("uploads");

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        // Strip any path components to prevent directory traversal
        String sanitized = Paths.get(filename).getFileName().toString();
        Path filePath = UPLOAD_DIR.resolve(sanitized).normalize();

        // Ensure the resolved path is still inside UPLOAD_DIR
        if (!filePath.startsWith(UPLOAD_DIR.toAbsolutePath().normalize()) && !filePath.startsWith(UPLOAD_DIR)) {
            return ResponseEntity.badRequest().build();
        }

        if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            return ResponseEntity.notFound().build();
        }

        String contentType;
        try {
            contentType = Files.probeContentType(filePath);
        } catch (IOException e) {
            contentType = null;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        contentType != null ? contentType : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                .body(new FileSystemResource(filePath));
    }
}
