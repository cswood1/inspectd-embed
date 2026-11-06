"""Photos for the web: each report photo re-encoded as WebP, 1024px on the long side at quality 55, with a
360px WebP thumbnail for the viewer's grid. About 70 KB and 10 KB a photo on these reports; the full set of
ten (778 photos) lands under 60 MB. Landscape photos stay at least 640px wide, which the viewer needs to pick
one for its header.

Quality is 55, not the 60 first planned: at 60 the ten reports came to 62.4 MB, over their 60 MB budget,
because the 1600px photos compress worse than the 1080px ones."""
from __future__ import annotations

import io

from PIL import Image

FULL, THUMB, QUALITY = 1024, 360, 55


def _webp(img: Image.Image, side: int) -> tuple[bytes, int, int]:
    im = img.copy()
    im.thumbnail((side, side), Image.LANCZOS)
    out = io.BytesIO()
    im.save(out, "WEBP", quality=QUALITY, method=6)
    return out.getvalue(), im.width, im.height


def web_photo(data: bytes) -> tuple[bytes, int, int, bytes]:
    """(photo bytes, width, height, thumbnail bytes) for one embedded photo."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    full, w, h = _webp(img, FULL)
    thumb, _, _ = _webp(img, THUMB)
    return full, w, h, thumb
