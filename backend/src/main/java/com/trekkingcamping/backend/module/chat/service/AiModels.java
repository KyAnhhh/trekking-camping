package com.trekkingcamping.backend.module.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trekkingcamping.backend.config.GeminiProperties;
import com.trekkingcamping.backend.module.chat.entity.AiConfigurationAudit;
import com.trekkingcamping.backend.module.chat.entity.AiModelActivity;
import com.trekkingcamping.backend.module.chat.entity.AiModelMetric;
import com.trekkingcamping.backend.module.chat.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Registry contains no credentials, provider URLs or user prompts. */
@Service
public class AiModels {
    public record Model(String id,String label,boolean enabled,boolean visible,boolean verified) {}
    public record Settings(List<Model> models,String chatDefault,String plannerDefault) {}
    public record View(long revision,Settings settings) {}
    public record Update(long revision,Settings settings) {}
    public record PublicModels(List<Model> models,String defaultModel) {}
    public record Usage(long calls,long failures,long totalMillis,String lastError,Instant lastCall) {}
    public record ActivityItem(Long id, String modelId, String actionType, long durationMs, String status, String errorCode, Instant createdAt) {}

    private final AiConfigurationRepository configs;
    private final AiConfigurationAuditRepository audits;
    private final GeminiProperties properties;
    private final ObjectMapper json;
    private final AiModelMetricRepository metricRepo;
    private final AiModelActivityRepository activityRepo;
    private final Map<String,Usage> usage=new ConcurrentHashMap<>();

    public AiModels(AiConfigurationRepository configs,AiConfigurationAuditRepository audits,GeminiProperties properties,ObjectMapper json) {
        this(configs, audits, properties, json, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AiModels(AiConfigurationRepository configs,AiConfigurationAuditRepository audits,GeminiProperties properties,ObjectMapper json,
            AiModelMetricRepository metricRepo, AiModelActivityRepository activityRepo) {
        this.configs=configs;this.audits=audits;this.properties=properties;this.json=json;
        this.metricRepo=metricRepo;this.activityRepo=activityRepo;
        loadPersistedMetrics();
    }

    private void loadPersistedMetrics() {
        if (metricRepo != null) {
            try {
                for (var row : metricRepo.findAll()) {
                    usage.put(row.getModelId(), new Usage(row.getCalls(), row.getFailures(), row.getTotalMillis(), row.getLastError(), row.getLastCall()));
                }
            } catch (Exception ignored) {}
        }
    }

    Settings defaults() {
        var rows=new ArrayList<Model>();
        for(String id:properties.getModels()) if(!id.startsWith("gemma-")) {
            String label = id.equals("gemini-3.5-flash-lite") ? "Gemini 3.5 Flash Lite" :
                           id.equals("gemini-3.5-flash") ? "Gemini 3.5 Flash" : id;
            rows.add(new Model(id,label,true,true,true));
        }
        if(rows.isEmpty()) rows.add(new Model(GeminiProperties.DEFAULT_MODEL,"Gemini 3.5 Flash Lite",true,true,true));
        rows.add(new Model("gemma-4-31b-it","Gemma 4 · 31B",false,false,false));
        rows.add(new Model("gemma-4-26b-a4b-it","Gemma 4 · 26B A4B",false,false,false));
        return new Settings(List.copyOf(rows),null,null);
    }
    private Settings decode(String value) {
        if("{}".equals(value)) return defaults();
        try {
            var old=json.readValue(value,Settings.class);
            var defModels = defaults().models();
            var allowed = new HashSet<>(defModels.stream().map(Model::id).toList());
            var validOld = old.models() == null ? List.<Model>of() : old.models().stream().filter(m -> allowed.contains(m.id())).toList();
            List<Model> merged;
            if (validOld.size() == defModels.size()) {
                merged = new ArrayList<>(validOld);
            } else {
                merged = new ArrayList<>(validOld);
                var existingIds = new HashSet<>(validOld.stream().map(Model::id).toList());
                for (var def : defModels) {
                    if (!existingIds.contains(def.id())) {
                        merged.add(def);
                    }
                }
            }
            merged.sort(Comparator.comparingInt(m -> m.id().equals(GeminiProperties.DEFAULT_MODEL) ? 0 : (m.enabled() && m.visible() ? 1 : 2)));
            return new Settings(List.copyOf(merged), null, null);
        }
        catch(Exception e) { throw new IllegalStateException("Invalid stored AI configuration",e); }
    }
    private String encode(Settings value) {
        try { return json.writeValueAsString(value); } catch(Exception e) { throw new IllegalArgumentException("Invalid AI settings"); }
    }
    @Transactional(readOnly=true) public View view() {
        return configs.findById(1).map(c->new View(c.getRevision(),decode(c.getDocument())))
            .orElseGet(()->new View(0,defaults()));
    }
    public PublicModels available() {
        var s=view().settings();
        return new PublicModels(s.models().stream().filter(m->m.enabled() && m.visible()).toList(), GeminiProperties.DEFAULT_MODEL);
    }
    public String resolve(String requested,boolean planner) {
        var s=view().settings();
        if(requested==null || requested.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Hãy chọn model AI trước khi gửi yêu cầu.");
        String id=requested;
        return s.models().stream().filter(m->m.id().equals(id) && m.enabled() && m.visible())
            .findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"Model không còn khả dụng. Hãy chọn model khác.")).id();
    }
    void validate(Settings s) {
        if(s==null || s.models()==null || s.models().size()!=defaults().models().size()) throw new IllegalArgumentException("Danh sách model chưa hợp lệ.");
        var allowed=new HashSet<>(defaults().models().stream().map(Model::id).toList());
        for(var m:s.models()) {
            if(m==null || !allowed.remove(m.id()) || m.label()==null || m.label().isBlank() || m.label().length()>80)
                throw new IllegalArgumentException("Model ID hoặc tên hiển thị chưa hợp lệ.");
            if(m.visible() && !m.enabled()) throw new IllegalArgumentException("Model công khai phải đang bật.");
            if(m.enabled() && !m.verified()) throw new IllegalArgumentException("Cần xác nhận kiểm thử tương thích trước khi bật model.");
        }
    }
    @Transactional public View save(Update input,String actor) {
        if(input==null) throw new IllegalArgumentException("Thiếu cấu hình.");
        validate(input.settings());
        input=new Update(input.revision(),new Settings(input.settings().models(),null,null));
        var row=configs.locked().orElseGet(()->{
            configs.insertDefaultIfMissing();
            return configs.locked().orElseThrow(()->new IllegalStateException("AI configuration initialization failed"));
        });
        if(row.getRevision()!=input.revision()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Cấu hình đã thay đổi. Hãy tải lại trước khi lưu.");
        if(!audits.existsById(row.getRevision())) record(row.getRevision(),decode(row.getDocument()),actor);
        row.setRevision(row.getRevision()+1);row.setDocument(encode(input.settings()));
        record(row.getRevision(),input.settings(),actor);
        return new View(row.getRevision(),input.settings());
    }
    private void record(long revision,Settings s,String actor) {
        var a=new AiConfigurationAudit();a.setRevision(revision);a.setDocument(encode(s));a.setChangedBy(actor);a.setChangedAt(Instant.now());audits.save(a);
    }
    @Transactional(readOnly=true) public List<AiConfigurationAudit> history() { return audits.findTop20ByOrderByRevisionDesc(); }
    @Transactional public View restore(long revision,long expected,String actor) {
        var a=audits.findById(revision).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy phiên bản."));
        return save(new Update(expected,decode(a.getDocument())),actor);
    }
    public void measured(String id,long millis,String error) {
        if (id == null || id.isBlank()) return;
        var updated = usage.compute(id,(key,old)->new Usage(old==null?1:old.calls()+1,(old==null?0:old.failures())+(error==null?0:1),
            (old==null?0:old.totalMillis())+millis,error,Instant.now()));

        if (metricRepo != null) {
            try {
                metricRepo.save(new AiModelMetric(id, updated.calls(), updated.failures(), updated.totalMillis(), updated.lastError(), updated.lastCall()));
            } catch (Exception ignored) {}
        }
        if (activityRepo != null) {
            try {
                activityRepo.save(new AiModelActivity(id, "STREAM_CHAT", millis, error == null ? "SUCCESS" : "FAILED", error));
            } catch (Exception ignored) {}
        }
    }
    public Map<String,Usage> metrics() { return Map.copyOf(usage); }
    public List<ActivityItem> recentActivities() {
        if (activityRepo == null) return List.of();
        try {
            return activityRepo.findTop50ByOrderByCreatedAtDesc().stream()
                .map(a -> new ActivityItem(a.getId(), a.getModelId(), a.getActionType(), a.getDurationMs(), a.getStatus(), a.getErrorCode(), a.getCreatedAt()))
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }
}
