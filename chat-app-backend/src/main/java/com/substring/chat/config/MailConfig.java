package com.substring.chat.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class MailConfig {

    /**
     * Creates JavaMailSender only when spring.mail.host is configured.
     * If host is absent (e.g. test profile), no bean is created and
     * EmailService falls back to its log-only mode (@Autowired required=false).
     */
    @Bean
    @ConditionalOnProperty(name = "spring.mail.host")
    public JavaMailSender javaMailSender(
            org.springframework.core.env.Environment env) {

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(env.getProperty("spring.mail.host"));
        sender.setPort(Integer.parseInt(env.getProperty("spring.mail.port", "587")));
        sender.setUsername(env.getProperty("spring.mail.username", ""));
        sender.setPassword(env.getProperty("spring.mail.password", ""));

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth",
                env.getProperty("spring.mail.properties.mail.smtp.auth", "true"));
        props.put("mail.smtp.starttls.enable",
                env.getProperty("spring.mail.properties.mail.smtp.starttls.enable", "true"));
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");

        return sender;
    }
}
