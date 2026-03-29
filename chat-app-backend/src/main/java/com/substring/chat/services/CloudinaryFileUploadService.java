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

        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) cloudinary.uploader().upload(file.getBytes(), options);

        return new UploadResult(
                (String) result.get("secure_url"),
                (String) result.get("public_id"),
                (String) result.get("resource_type"),
                file.getSize()
        );
    }
}
