// Lazy-loaded image captioning via transformers.js (Xenova vit-gpt2-image-captioning).
// Runs 100% in the browser. No API keys. Model downloads on first use (~250MB),
// then cached by the browser for subsequent runs.

type Pipeline = (input: string | HTMLImageElement | ImageBitmap) => Promise<Array<{ generated_text: string }>>;

let cached: Pipeline | null = null;
let loading: Promise<Pipeline> | null = null;

export async function loadCaptioner(onProgress?: (msg: string) => void): Promise<Pipeline> {
  if (cached) return cached;
  if (loading) return loading;

  loading = (async () => {
    onProgress?.('Loading transformers.js…');
    const { pipeline, env } = await import('@huggingface/transformers');
    // Allow remote model loading (default), keep WASM/WebGPU choices automatic.
    env.allowLocalModels = false;

    onProgress?.('Downloading image captioning model (~250MB, cached after first run)…');
    const pipe = (await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning', {
      progress_callback: (p: { status?: string; progress?: number; file?: string }) => {
        if (p?.status === 'progress' && p?.progress != null) {
          onProgress?.(`Loading ${p.file ?? 'model'} — ${Math.round(p.progress)}%`);
        }
      },
    })) as unknown as Pipeline;

    cached = pipe;
    onProgress?.('Captioner ready.');
    return pipe;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

export async function captionImage(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  const pipe = await loadCaptioner(onProgress);
  const url = URL.createObjectURL(file);
  try {
    const result = await pipe(url);
    const text = Array.isArray(result) ? result[0]?.generated_text : '';
    if (!text) throw new Error('Captioner returned no text.');
    return text;
  } finally {
    URL.revokeObjectURL(url);
  }
}
