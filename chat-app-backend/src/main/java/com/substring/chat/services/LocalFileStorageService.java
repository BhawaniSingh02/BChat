package com.substring.chat.services;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Fallback file storage used when Cloudinary is NOT configured.
 * Saves files to a local "uploads/" directory and returns a localhost URL.
 * Use Cloudinary (via CloudinaryFileUploadService) in production.
 */
@Service
@ConditionalOnMissingBean(Cloudinary.class)
@Slf4j
public class LocalFileStorageService implements FileUploadService {

    private static final Path UPLOAD_DIR = Paths.get("uploads");

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @PostConstruct
    public void init() throws IOException {
        Files.createDirectories(UPLOAD_DIR);
        log.info("Local file storage active — files saved to '{}'. Set cloudinary.* properties to switch to Cloudinary.", UPLOAD_DIR.toAbsolutePath());
    }

    @Override
    public UploadResult upload(MultipartFile file) throws Exception {
        String originalName = file.getOriginalFilename() != null
                ? Paths.get(file.getOriginalFilename()).getFileName().toString()
                : "file";
        // UUID prefix prevents collisions and makes URLs non-enumerable
        String storedName = UUID.randomUUID() + "_" + originalName;
        Path destination = UPLOAD_DIR.resolve(storedName);
        Files.write(destination, file.getBytes());

        String contentType = file.getContentType() != null ? file.getContentType() : "";
        String resourceType = contentType.startsWith("image/") ? "image"
                : contentType.startsWith("video/") ? "video"
                : "raw";

        String url = (baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl) + "/api/v1/files/" + storedName;
        log.debug("Stored file locally: {}", destination.toAbsolutePath());
        return new UploadResult(url, storedName, resourceType, file.getSize());
    }
}
