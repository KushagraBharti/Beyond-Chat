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



# YUVRAJ

## Weekly Summary
- Week 6 was focused on significantly improving the frontend experience and making the Image Studio feel like a polished, usable product rather than just a functional pipeline.
- I spent most of the week working on UI/UX improvements, state handling, and making sure the image generation flow felt smooth, responsive, and consistent with the rest of the app.
- The goal was to bridge the gap between backend functionality and actual user experience by refining how users interact with image generation, previews, and saved outputs.

## Work Completed
- Refactored the Image Studio frontend to support a more structured generation flow, including prompt input, model selection, and output rendering.
- Improved the UI layout and interaction patterns for the Image Studio to better match the overall design system used across other studios.
- Implemented responsive state handling for generation requests, including loading states, disabled actions during execution, and error feedback.
- Worked on rendering generated images dynamically using signed URLs, ensuring images display correctly immediately after generation.
- Improved the gallery experience by restructuring how image artifacts are displayed, including grid layout adjustments and better visual hierarchy.
- Added client-side handling for newly generated images so they appear instantly in the UI without requiring a full refresh.
- Refined the artifact preview system so images are properly linked to runs and can be revisited across sessions.
- Helped debug frontend/backend integration issues related to run outputs and ensured the data contract between the API and UI remained consistent.
- Worked on improving UX details such as prompt input behavior, button states, and transitions to make the interaction feel more fluid.
- Ran end-to-end testing of the Image Studio flow (prompt → generation → upload → display) to ensure the experience was stable and intuitive.

## Research / Technical Findings
- Handling async UI state correctly (loading, success, error) is critical for long-running operations like image generation.
- Rendering images from signed URLs requires careful state management to avoid broken or expired previews.
- Immediate UI updates after generation (optimistic rendering) significantly improve perceived performance and usability.
- Consistent component structure across studios helps maintain a unified product experience while still allowing specialized functionality.

## Blockers / Risks
- Signed URL expiration can cause images to disappear from the UI unless a refresh mechanism is implemented.
- Image generation latency creates UX challenges that require better feedback mechanisms (progress indicators, status states).
- Differences in backend response formats can still introduce edge cases in how outputs are rendered on the frontend.

## Hours Worked
- Total estimated time: 21 hours
