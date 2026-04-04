package com.substring.chat.controllers;

import com.substring.chat.services.FileUploadService;
import com.substring.chat.services.UploadRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.security.Principal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileUploadControllerTest {

    @Mock
    private FileUploadService fileUploadService;

    @Mock
    private UploadRateLimiter uploadRateLimiter;

    @InjectMocks
    private FileUploadController controller;

    private Principal principal;

    @BeforeEach
    void setUp() {
        principal = mock(Principal.class);
        lenient().when(principal.getName()).thenReturn("alice");
        lenient().when(uploadRateLimiter.isAllowed("alice")).thenReturn(true);
    }

    @Test
    void upload_returnsOkWithUrlForImage() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[100]);

        when(fileUploadService.upload(any()))
                .thenReturn(new FileUploadService.UploadResult(
                        "https://res.cloudinary.com/test/image/upload/photo.jpg",
                        "bchat/photo", "image", 100L));

        ResponseEntity<?> response = controller.upload(file, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        FileUploadController.UploadResponse body = (FileUploadController.UploadResponse) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.url()).contains("cloudinary.com");
        assertThat(body.messageType()).isEqualTo("IMAGE");
    }

    @Test
    void upload_returnsFileTypeForPdf() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "doc.pdf", "application/pdf", new byte[200]);

        when(fileUploadService.upload(any()))
                .thenReturn(new FileUploadService.UploadResult(
                        "https://res.cloudinary.com/test/raw/upload/doc.pdf",
                        "bchat/doc", "raw", 200L));

        ResponseEntity<?> response = controller.upload(file, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        FileUploadController.UploadResponse body = (FileUploadController.UploadResponse) response.getBody();
        assertThat(body.messageType()).isEqualTo("FILE");
    }

    @Test
    void upload_returnsVideoTypeForMp4() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "clip.mp4", "video/mp4", new byte[500]);

        when(fileUploadService.upload(any()))
                .thenReturn(new FileUploadService.UploadResult(
                        "https://res.cloudinary.com/test/video/upload/clip.mp4",
                        "bchat/clip", "video", 500L));

        ResponseEntity<?> response = controller.upload(file, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        FileUploadController.UploadResponse body = (FileUploadController.UploadResponse) response.getBody();
        assertThat(body.messageType()).isEqualTo("VIDEO");
    }

    @Test
    void upload_returnsBadRequestForEmptyFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.jpg", "image/jpeg", new byte[0]);

        // Empty file check happens before rate limit — null principal is fine
        ResponseEntity<?> response = controller.upload(file, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void upload_returnsPayloadTooLargeForImageExceeding10MB() {
        byte[] bigContent = new byte[11 * 1024 * 1024]; // 11 MB
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.jpg", "image/jpeg", bigContent);

        // Size check happens before rate limit — null principal is fine
        ResponseEntity<?> response = controller.upload(file, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @Test
    void upload_returnsPayloadTooLargeForVideoExceeding50MB() {
        byte[] bigContent = new byte[51 * 1024 * 1024]; // 51 MB
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.mp4", "video/mp4", bigContent);

        ResponseEntity<?> response = controller.upload(file, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @Test
    void upload_allowsVideoUnder50MB() throws Exception {
        byte[] content = new byte[20 * 1024 * 1024]; // 20 MB — under video limit
        MockMultipartFile file = new MockMultipartFile(
                "file", "video.mp4", "video/mp4", content);

        when(fileUploadService.upload(any()))
                .thenReturn(new FileUploadService.UploadResult(
                        "https://res.cloudinary.com/test/video/upload/video.mp4",
                        "bchat/video", "video", content.length));

        ResponseEntity<?> response = controller.upload(file, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void upload_returnsUnsupportedMediaTypeForDisallowedContentType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "script.exe", "application/octet-stream", new byte[100]);

        // Type check happens before rate limit — null principal is fine
        ResponseEntity<?> response = controller.upload(file, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    @Test
    void upload_returnsServiceUnavailableWhenFileUploadServiceIsNull() {
        FileUploadController ctrl = new FileUploadController();
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[100]);

        // Service-unavailable check is first — null principal is fine
        ResponseEntity<?> response = ctrl.upload(file, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void upload_returnsTooManyRequestsWhenRateLimitExceeded() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[100]);
        when(uploadRateLimiter.isAllowed("alice")).thenReturn(false);

        ResponseEntity<?> response = controller.upload(file, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void upload_returnsInternalServerErrorWhenUploadFails() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[100]);

        when(fileUploadService.upload(any())).thenThrow(new RuntimeException("Cloudinary error"));

        ResponseEntity<?> response = controller.upload(file, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // ── Phase 24 — Voice Messages ─────────────────────────────────────────

    @Test
    void upload_returnsAudioTypeForWebmAudio() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "voice.webm", "audio/webm", new byte[1000]);

        when(fileUploadService.upload(any()))
                .thenReturn(new FileUploadService.UploadResult(
                        "https://res.cloudinary.com/test/video/upload/voice.webm",
                        "bchat/voice", "video", 1000L));

        ResponseEntity<?> response = controller.upload(file, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        FileUploadController.UploadResponse body = (FileUploadController.UploadResponse) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.messageType()).isEqualTo("AUDIO");
    }

    @Test
    void upload_returnsAudioTypeForOggAudio() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "voice.ogg", "audio/ogg", new byte[500]);

        when(fileUploadService.upload(any()))
                .thenReturn(new FileUploadService.UploadResult(
                        "https://res.cloudinary.com/test/video/upload/voice.ogg",
                        "bchat/voice", "video", 500L));

        ResponseEntity<?> response = controller.upload(file, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        FileUploadController.UploadResponse body = (FileUploadController.UploadResponse) response.getBody();
        assertThat(body.messageType()).isEqualTo("AUDIO");
    }

    @Test
    void upload_returnsPayloadTooLargeForAudioExceeding25MB() {
        byte[] bigContent = new byte[26 * 1024 * 1024]; // 26 MB — over audio limit
        MockMultipartFile file = new MockMultipartFile(
                "file", "long.webm", "audio/webm", bigContent);

        ResponseEntity<?> response = controller.upload(file, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @Test
    void upload_allowsAudioUnder25MB() throws Exception {
        byte[] content = new byte[10 * 1024 * 1024]; // 10 MB — under audio limit
        MockMultipartFile file = new MockMultipartFile(
                "file", "voice.webm", "audio/webm", content);

        when(fileUploadService.upload(any()))
                .thenReturn(new FileUploadService.UploadResult(
                        "https://res.cloudinary.com/test/video/upload/voice.webm",
                        "bchat/voice", "video", content.length));

        ResponseEntity<?> response = controller.upload(file, principal);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        FileUploadController.UploadResponse body = (FileUploadController.UploadResponse) response.getBody();
        assertThat(body.messageType()).isEqualTo("AUDIO");
    }
}
