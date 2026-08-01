package com.substring.chat.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;

import java.time.Duration;

/**
 * Caches hot reads (rooms list, per-user room list, self profile) in Redis.
 * Only active when {@code spring.cache.type=redis} (see application-*.properties) —
 * the test profile uses {@code spring.cache.type=simple} (in-memory, no Redis
 * dependency) so this customizer is simply unused there.
 *
 * The cache is best-effort: if Redis is unreachable, {@link #errorHandler()}
 * logs and swallows the failure instead of propagating it, so every cached
 * read/write transparently falls back to the database rather than breaking
 * the app when no Redis instance is running (e.g. local dev without Redis).
 */
@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    @Bean
    public RedisCacheManagerBuilderCustomizer cacheManagerCustomizer() {
        RedisCacheConfiguration jsonConfig = RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        return builder -> builder
                .cacheDefaults(jsonConfig.entryTtl(Duration.ofMinutes(10)))
                .withCacheConfiguration("allRooms", jsonConfig.entryTtl(Duration.ofMinutes(5)))
                .withCacheConfiguration("userRooms", jsonConfig.entryTtl(Duration.ofMinutes(10)))
                .withCacheConfiguration("userProfile", jsonConfig.entryTtl(Duration.ofMinutes(15)));
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException e, Cache cache, Object key) {
                log.warn("Cache GET failed on '{}' (falling back to DB): {}", cache.getName(), e.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException e, Cache cache, Object key, Object value) {
                log.warn("Cache PUT failed on '{}': {}", cache.getName(), e.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException e, Cache cache, Object key) {
                log.warn("Cache EVICT failed on '{}': {}", cache.getName(), e.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException e, Cache cache) {
                log.warn("Cache CLEAR failed on '{}': {}", cache.getName(), e.getMessage());
            }
        };
    }
}
