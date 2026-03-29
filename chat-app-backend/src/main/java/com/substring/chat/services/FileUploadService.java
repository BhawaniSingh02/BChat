package com.substring.chat.services;

import org.springframework.web.multipart.MultipartFile;

public interface FileUploadService {

    UploadResult upload(MultipartFile file) throws Exception;

    record UploadResult(String url, String publicId, String resourceType, long bytes) {}
}
