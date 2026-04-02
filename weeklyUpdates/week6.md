# NISHANT

## Weekly Summary
- Week 6 was focused on building the Image Studio handler end-to-end, connecting OpenRouter's image generation API to the backend pipeline and wiring the output through to Supabase Storage.
- Work centered on implementing the three-step run workflow — prompt enhancement, image generation, and storage upload — and updating the frontend gallery to render actual images from signed URLs.
- The goal was to take the Image Studio from a disconnected placeholder to a fully functional generation pipeline that produces real images, stores them in the workspace bucket, and surfaces them in the gallery.

## Work Completed
- Built `call_openrouter_image()` in `providers.py` to call OpenRouter's `/api/v1/images/generations` endpoint, handling both `b64_json` and URL-based responses by downloading the image bytes.
- Added `upload_image_file()` in `supabase_service.py` to upload generated images to Supabase Storage under the path `workspace_id/images/run_id/image_N.png` with a 24-hour signed URL.
- Added `openrouter_image_default_model` to `config.py` (defaults to `openai/dall-e-3`, overridable via env var).
- Replaced the image studio stub in `execute_run()` with a real three-step workflow:
  - `enhance_prompt` — calls the text LLM to rewrite the user's prompt with style and quality hints before generation.
  - `generate` — calls the image model via OpenRouter with the enhanced prompt and aspect-ratio-mapped size.
  - `upload` — uploads each image to Supabase Storage and collects signed URLs.
- Added `_ratio_to_size()` helper to map frontend aspect ratio options (`1:1`, `16:9`, `9:16`, `4:5`) to pixel dimensions.
- Updated `execute_run()` signature to accept `workspace_id` so the upload step can scope images to the correct workspace bucket path.
- Updated `ImagePage.tsx` to replace placeholder model options with real OpenRouter image models (DALL-E 3, GPT Image 1, Flux 1.1 Pro, Stable Diffusion 3.5).
- Updated the frontend `handleGenerate` handler to extract `run.output.urls`, display newly generated images immediately, and auto-save each image as an artifact so it persists in the gallery across sessions.
- Updated the gallery to render actual `<img>` tags from `item.previewImage` instead of empty placeholder divs.

## Research / Technical Findings
- OpenRouter's image generation API follows the OpenAI `/v1/images/generations` contract, making it straightforward to integrate alongside the existing chat completion layer.
- Image responses can come back as either `b64_json` or a hosted URL depending on the model — handling both cases is necessary for multi-model support.
- Storing images in Supabase under a `workspace_id/images/run_id/` path keeps storage scoped correctly and aligns with the existing artifact upload conventions.
- A prompt enhancement step before generation meaningfully improves output quality, especially when users provide short or abstract prompts.
- Signed URLs with a 24-hour expiry are a practical tradeoff for the MVP; longer-lived access would require public bucket configuration or on-demand URL refresh.

## Blockers / Risks
- Signed URLs expire after 24 hours, so gallery images will eventually stop rendering without a URL refresh mechanism.
- Not all OpenRouter image models support every size dimension — models may return errors for non-standard sizes like `1024x1280` depending on the provider.
- Image generation latency is significantly higher than text completions; long-running requests may need timeout adjustments beyond the current 120-second client setting.

## Hours Worked
- Total estimated time: 6 hours
