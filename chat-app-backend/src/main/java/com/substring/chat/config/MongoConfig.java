package com.substring.chat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = "com.substring.chat.repositories")
public class MongoConfig {

    @Bean
    public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDatabaseFactory) {
        MongoTemplate template = new MongoTemplate(mongoDatabaseFactory);

        // MongoDB forbids '.' in document/map keys. Several maps are keyed by
        // username/uniqueHandle, which now contain dots (e.g. "aditya.raj.5923").
        // Without a replacement, saving such a map (e.g. DirectConversation.mutedBy)
        // throws and the request fails with a 500 — this is why muting a conversation
        // failed. Encode dots in map keys transparently on write/read.
        if (template.getConverter() instanceof MappingMongoConverter converter) {
            converter.setMapKeyDotReplacement("#DOT#");
        }

        return template;
    }
}
