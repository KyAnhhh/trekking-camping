package com.trekkingcamping.backend.config;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Collection;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    public static final String CACHE_TOURS = "tours";
    public static final String CACHE_TOUR_DETAIL = "tour-detail";
    public static final String CACHE_ITINERARIES = "tour-itineraries";
    public static final String CACHE_GEARS = "tour-gears";
    public static final String CACHE_IMAGES = "tour-images";

    @Bean
    public CacheManager cacheManager() {
        return new TtlConcurrentMapCacheManager(Map.of(
            CACHE_TOURS, TimeUnit.MINUTES.toMillis(10),
            CACHE_TOUR_DETAIL, TimeUnit.MINUTES.toMillis(10),
            CACHE_ITINERARIES, TimeUnit.MINUTES.toMillis(15),
            CACHE_GEARS, TimeUnit.MINUTES.toMillis(15),
            CACHE_IMAGES, TimeUnit.MINUTES.toMillis(15)
        ));
    }

    public static class TtlConcurrentMapCacheManager implements CacheManager {
        private final Map<String, Cache> caches = new ConcurrentHashMap<>();
        private final Map<String, Long> ttls;

        public TtlConcurrentMapCacheManager(Map<String, Long> ttls) {
            this.ttls = ttls;
        }

        @Override
        public Cache getCache(String name) {
            return caches.computeIfAbsent(name, n -> {
                long ttl = ttls.getOrDefault(n, TimeUnit.MINUTES.toMillis(5));
                return new TtlCache(n, ttl);
            });
        }

        @Override
        public Collection<String> getCacheNames() {
            return caches.keySet();
        }
    }

    public static class TtlCache implements Cache {
        private final String name;
        private final long ttlMillis;
        private final ConcurrentHashMap<Object, Entry> store = new ConcurrentHashMap<>();

        public TtlCache(String name, long ttlMillis) {
            this.name = name;
            this.ttlMillis = ttlMillis;
        }

        private record Entry(Object value, long expiry) {}

        @Override
        public String getName() {
            return name;
        }

        @Override
        public Object getNativeCache() {
            return store;
        }

        @Override
        public ValueWrapper get(Object key) {
            Entry entry = store.get(key);
            if (entry == null) return null;
            if (System.currentTimeMillis() > entry.expiry()) {
                store.remove(key);
                return null;
            }
            return () -> entry.value();
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> T get(Object key, Class<T> type) {
            ValueWrapper wrapper = get(key);
            if (wrapper == null) return null;
            Object val = wrapper.get();
            if (val != null && type != null && !type.isInstance(val)) {
                throw new IllegalStateException("Cached value is not of required type [" + type.getName() + "]: " + val);
            }
            return (T) val;
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> T get(Object key, Callable<T> valueLoader) {
            ValueWrapper wrapper = get(key);
            if (wrapper != null) {
                return (T) wrapper.get();
            }
            synchronized (store) {
                wrapper = get(key);
                if (wrapper != null) {
                    return (T) wrapper.get();
                }
                try {
                    T value = valueLoader.call();
                    put(key, value);
                    return value;
                } catch (Exception e) {
                    throw new ValueRetrievalException(key, valueLoader, e);
                }
            }
        }

        @Override
        public void put(Object key, Object value) {
            if (value != null) {
                store.put(key, new Entry(value, System.currentTimeMillis() + ttlMillis));
            } else {
                evict(key);
            }
        }

        @Override
        public void evict(Object key) {
            store.remove(key);
        }

        @Override
        public void clear() {
            store.clear();
        }
    }
}
