package com.substring.chat.controllers;

import com.substring.chat.services.FileUploadService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileUploadControllerTest {

    @Mock
    private FileUploadService fileUploadService;

    @InjectMocks
    private FileUploadController controller;

    @Test
    void upload_returnsOkWithUrlForImage() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[100]);

        when(fileUploadService.upload(any()))
                .thenReturn(new FileUploadService.UploadResult(
                        "https://res.cloudinary.com/test/image/upload/photo.jpg",
                        "bchat/photo", "image", 100L));

        ResponseEntity<?> response = controller.upload(file);

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

        ResponseEntity<?> response = controller.upload(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        FileUploadController.UploadResponse body = (FileUploadController.UploadResponse) response.getBody();
        assertThat(body.messageType()).isEqualTo("FILE");
    }

    @Test
    void upload_returnsBadRequestForEmptyFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.jpg", "image/jpeg", new byte[0]);

        ResponseEntity<?> response = controller.upload(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void upload_returnsPayloadTooLargeForOversizedFile() {
        byte[] bigContent = new byte[11 * 1024 * 1024]; // 11MB
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.jpg", "image/jpeg", bigContent);

        ResponseEntity<?> response = controller.upload(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @Test
    void upload_returnsUnsupportedMediaTypeForDisallowedContentType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "script.exe", "application/octet-stream", new byte[100]);

        ResponseEntity<?> response = controller.upload(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    @Test
    void upload_returnsServiceUnavailableWhenFileUploadServiceIsNull() {
        // Controller with null fileUploadService (not configured)
        FileUploadController ctrl = new FileUploadController();
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[100]);

        ResponseEntity<?> response = ctrl.upload(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void upload_returnsInternalServerErrorWhenUploadFails() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[100]);

        when(fileUploadService.upload(any())).thenThrow(new RuntimeException("Cloudinary error"));

        ResponseEntity<?> response = controller.upload(file);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
