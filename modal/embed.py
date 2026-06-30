"""
Modal CLIP embedding worker.

Exposes two web endpoints:
  POST /embed        — embed a post (text, image, video, carousel) → 512-dim vector
  POST /embed_query  — embed a search query text → 512-dim vector

Deploy:
  modal deploy modal/embed.py

Set these env vars in Modal secrets (named "family-app"):
  SUPABASE_URL, SUPABASE_SECRET_KEY  (not strictly needed here, caller handles DB writes)
"""

import io
import os
import tempfile

import av
import modal
import numpy as np
import requests
import torch
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
from transformers import CLIPProcessor, CLIPModel


def _check_auth(request: Request) -> None:
    token = os.environ.get("MODAL_TOKEN", "")
    auth = request.headers.get("Authorization", "")
    if not token or auth != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="Unauthorized")

app = modal.App("family-embed")

CLIP_MODEL = "openai/clip-vit-base-patch32"

image = (
    modal.Image.debian_slim()
    .pip_install(
        "transformers",
        "torch",
        "Pillow",
        "requests",
        "av",  # PyAV for video keyframe extraction
        "numpy",
    )
)


@app.cls(
    image=image,
    gpu="T4",
    scaledown_window=60,
    secrets=[modal.Secret.from_name("family-app")],
)
class Embedder:
    @modal.enter()
    def load_model(self):
        self.model = CLIPModel.from_pretrained(CLIP_MODEL)
        self.processor = CLIPProcessor.from_pretrained(CLIP_MODEL)
        self.model.eval()

    def _embed_texts(self, texts: list[str]) -> np.ndarray:
        inputs = self.processor(text=texts, return_tensors="pt", padding=True, truncation=True)
        with torch.no_grad():
            features = self.model.get_text_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy()

    def _embed_images(self, images) -> np.ndarray:
        inputs = self.processor(images=images, return_tensors="pt")
        with torch.no_grad():
            features = self.model.get_image_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy()

    def _load_image_from_url(self, url: str):
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        return Image.open(resp.raw).convert("RGB")

    def _extract_keyframes(self, url: str, max_frames: int = 8):
        """Download video and extract evenly-spaced keyframes as PIL Images."""
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(resp.content)
            tmp_path = f.name

        frames = []
        try:
            container = av.open(tmp_path)
            video_stream = container.streams.video[0]
            total = video_stream.frames or 1
            step = max(1, total // max_frames)
            for i, frame in enumerate(container.decode(video=0)):
                if i % step == 0:
                    frames.append(frame.to_image())
                if len(frames) >= max_frames:
                    break
            container.close()
        finally:
            os.unlink(tmp_path)

        return frames if frames else None

    @modal.method()
    def embed_post(self, post_type: str, caption: str | None, media_urls: list[str]) -> list[float]:
        vecs = []

        if caption:
            text_vec = self._embed_texts([caption])[0]
            vecs.append(text_vec)

        if post_type == "text":
            pass  # already handled caption above

        elif post_type == "image":
            for url in media_urls:
                img = self._load_image_from_url(url)
                img_vec = self._embed_images([img])[0]
                vecs.append(img_vec)

        elif post_type == "video":
            for url in media_urls:
                frames = self._extract_keyframes(url)
                if frames:
                    frame_vecs = self._embed_images(frames)
                    vecs.append(frame_vecs.mean(axis=0))

        elif post_type == "carousel":
            for url in media_urls:
                img = self._load_image_from_url(url)
                img_vec = self._embed_images([img])[0]
                vecs.append(img_vec)

        if not vecs:
            raise ValueError("No content to embed")

        combined = np.stack(vecs).mean(axis=0)
        combined = combined / np.linalg.norm(combined)
        return combined.tolist()

    @modal.method()
    def embed_query(self, text: str) -> list[float]:
        vec = self._embed_texts([text])[0]
        return vec.tolist()


@app.function(image=image, secrets=[modal.Secret.from_name("family-app")])
@modal.fastapi_endpoint(method="POST")
async def embed(request: Request):
    _check_auth(request)
    body = await request.json()
    post_id = body.get("post_id")
    post_type = body.get("type")
    caption = body.get("caption")
    media_urls = body.get("media_urls", [])

    if not post_type:
        raise HTTPException(status_code=400, detail="Missing type")

    try:
        vector = await Embedder().embed_post.remote.aio(post_type, caption, media_urls)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse({"post_id": post_id, "embedding": vector})


@app.function(image=image, secrets=[modal.Secret.from_name("family-app")])
@modal.fastapi_endpoint(method="POST")
async def embed_query_endpoint(request: Request):
    _check_auth(request)
    body = await request.json()
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Missing text")

    try:
        vector = Embedder().embed_query.remote(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse({"embedding": vector})
