package com.substring.chat.services;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CloudinaryFileUploadServiceTest {

    @Test
    void images_useImageResourceType() {
        assertThat(CloudinaryFileUploadService.resolveResourceType("image/jpeg")).isEqualTo("image");
        assertThat(CloudinaryFileUploadService.resolveResourceType("image/png")).isEqualTo("image");
        assertThat(CloudinaryFileUploadService.resolveResourceType("image/webp")).isEqualTo("image");
    }

    @Test
    void videos_useVideoResourceType() {
        assertThat(CloudinaryFileUploadService.resolveResourceType("video/mp4")).isEqualTo("video");
    }

    @Test
    void audio_usesVideoResourceType() {
        // Cloudinary stores audio under the "video" resource type.
        assertThat(CloudinaryFileUploadService.resolveResourceType("audio/webm")).isEqualTo("video");
        // Codec suffix must be stripped.
        assertThat(CloudinaryFileUploadService.resolveResourceType("audio/webm;codecs=opus")).isEqualTo("video");
    }

    @Test
    void documents_useRawResourceType_soPdfDeliveryIsNotBlocked() {
        // The actual bug: PDFs were uploaded as "image" (via auto) and Cloudinary
        // blocks PDF delivery through the image type. "raw" fixes it.
        assertThat(CloudinaryFileUploadService.resolveResourceType("application/pdf")).isEqualTo("raw");
        assertThat(CloudinaryFileUploadService.resolveResourceType("application/msword")).isEqualTo("raw");
        assertThat(CloudinaryFileUploadService.resolveResourceType("text/plain")).isEqualTo("raw");
    }

    @Test
    void nullOrUnknownContentType_defaultsToRaw() {
        assertThat(CloudinaryFileUploadService.resolveResourceType(null)).isEqualTo("raw");
        assertThat(CloudinaryFileUploadService.resolveResourceType("application/octet-stream")).isEqualTo("raw");
    }
}
