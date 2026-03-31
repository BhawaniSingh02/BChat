package com.substring.chat.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
@ConditionalOnBean(Cloudinary.class)
@RequiredArgsConstructor
@Slf4j
public class CloudinaryFileUploadService implements FileUploadService {

    private final Cloudinary cloudinary;

    @Override
    public UploadResult upload(MultipartFile file) throws Exception {
        Map<?, ?> options = ObjectUtils.asMap(
                "folder", "bchat",
                "resource_type", "auto",
                "use_filename", true,
                "unique_filename", true
        );

        Object raw = cloudinary.uploader().upload(file.getBytes(), options);
        if (!(raw instanceof Map<?, ?> resultMap)) {
            throw new IllegalStateException("Unexpected response type from Cloudinary: " + (raw == null ? "null" : raw.getClass()));
        }
        String secureUrl = resultMap.get("secure_url") instanceof String s ? s : null;
        String publicId = resultMap.get("public_id") instanceof String s ? s : null;
        String resourceType = resultMap.get("resource_type") instanceof String s ? s : null;
        if (secureUrl == null) {
            throw new IllegalStateException("Cloudinary response missing secure_url");
        }

        return new UploadResult(secureUrl, publicId, resourceType, file.getSize());
    }
}
