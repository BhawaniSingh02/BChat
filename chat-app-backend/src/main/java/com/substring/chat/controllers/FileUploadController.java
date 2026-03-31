package com.substring.chat.controllers;

import com.substring.chat.services.FileUploadService;
import com.substring.chat.services.UploadRateLimiter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/upload")
@Slf4j
public class FileUploadController {

    // Images and documents: 10 MB
    private static final long MAX_IMAGE_DOC_SIZE = 10L * 1024 * 1024;
    // Video files: 50 MB
    private static final long MAX_VIDEO_SIZE = 50L * 1024 * 1024;

    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );
    private static final Set<String> DOC_TYPES = Set.of(
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    private static final Set<String> VIDEO_TYPES = Set.of(
            "video/mp4", "video/webm", "video/quicktime"
    );

    @Autowired(required = false)
    private FileUploadService fileUploadService;

    @Autowired(required = false)
    private UploadRateLimiter uploadRateLimiter;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, Principal principal) {
        // 1. Require Cloudinary to be configured
        if (fileUploadService == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "File uploads are not configured on this server."));
        }

        // 2. Basic file validation (no auth needed — fail fast)
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty."));
        }

        String contentType = file.getContentType();
        boolean isImage = contentType != null && IMAGE_TYPES.contains(contentType);
        boolean isVideo = contentType != null && VIDEO_TYPES.contains(contentType);
        boolean isDoc   = contentType != null && DOC_TYPES.contains(contentType);

        if (!isImage && !isVideo && !isDoc) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body(Map.of("error", "File type not supported. Allowed: images (JPEG/PNG/GIF/WebP), documents (PDF/DOCX/TXT), videos (MP4/WebM/MOV)."));
        }

        long maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_DOC_SIZE;
        if (file.getSize() > maxSize) {
            long limitMb = maxSize / (1024 * 1024);
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body(Map.of("error", String.format("File exceeds the %d MB limit for %s.", limitMb, isVideo ? "videos" : "images and documents")));
        }

        // 3. Per-user upload rate limit (10 uploads/minute)
        if (uploadRateLimiter != null && principal != null && !uploadRateLimiter.isAllowed(principal.getName())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Upload rate limit exceeded. Please wait before uploading again."));
        }

        // 4. Upload to Cloudinary
        try {
            FileUploadService.UploadResult result = fileUploadService.upload(file);
            String messageType = isImage ? "IMAGE" : isVideo ? "VIDEO" : "FILE";
            return ResponseEntity.ok(new UploadResponse(result.url(), messageType, result.bytes()));
        } catch (Exception e) {
            log.error("File upload failed for user {}: {}", principal != null ? principal.getName() : "unknown", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Upload failed. Please try again."));
        }
    }

    public record UploadResponse(String url, String messageType, long bytes) {}
}
