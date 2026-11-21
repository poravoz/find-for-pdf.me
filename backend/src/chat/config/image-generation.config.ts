export const IMAGE_GENERATION_CONFIG = {
    WIDTH: 512,
    HEIGHT: 512,
    BATCH_SIZE: 1,
    STEPS: 20,
    CFG: 8,
    SAMPLER: 'euler',
    SCHEDULER: 'simple',
    DENOISE: 1,
    CHECK_INTERVAL: 1000,
    MAX_CHECK_ATTEMPTS: 120,
    CHECKPOINT: 'v1-5-pruned-emaonly.safetensors',
    FILENAME_PREFIX: 'AIStudio',
};
