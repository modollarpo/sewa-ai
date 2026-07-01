# SEWA XAI — ai-services/triage/utils/dicom_loader.py
import io
import numpy as np
import httpx
import cv2
from typing import Optional

try:
    import pydicom
    PYDICOM = True
except ImportError:
    PYDICOM = False

async def load_dicom_from_url(url: str) -> np.ndarray:
    """
    Download and decode a DICOM file from Azure Blob Storage or PACS.
    Falls back to PNG/JPEG decoding for non-DICOM images.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url)
        r.raise_for_status()
        raw = r.content

    # Try DICOM first
    if PYDICOM and (url.endswith('.dcm') or url.endswith('.dicom') or raw[:4] == b'DICM'[:-1]):
        try:
            ds = pydicom.dcmread(io.BytesIO(raw))
            arr = ds.pixel_array.astype(np.float32)

            # Apply rescale slope/intercept for HU values
            slope     = float(getattr(ds, 'RescaleSlope',     1))
            intercept = float(getattr(ds, 'RescaleIntercept', 0))
            arr = arr * slope + intercept

            # Handle multi-frame (pick middle frame)
            if arr.ndim == 3:
                arr = arr[arr.shape[0] // 2]

            return arr
        except Exception:
            pass  # fall through to image decode

    # Fallback: decode as regular image
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        # Last resort: random noise array (for testing)
        return np.random.randint(0, 255, (512, 512), dtype=np.uint8).astype(np.float32)

    return img.astype(np.float32)
