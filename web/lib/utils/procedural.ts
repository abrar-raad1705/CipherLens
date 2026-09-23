/**
 * Procedural generation of synthetic test targets for instant client-side fallback
 * and offline optical calibration.
 */

export function generateCalibrationTarget(size = 512): string {
  if (typeof document === "undefined") {
    // Server-side fallback minimal 1x1 png
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Deep dark background
  ctx.fillStyle = "#10131A";
  ctx.fillRect(0, 0, size, size);

  const center = size / 2;

  // Concentric calibration rings (Chirp frequency zone)
  ctx.strokeStyle = "#4A5568";
  ctx.lineWidth = 1;
  for (let r = 20; r < center - 10; r += 14) {
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Radial frequency spokes
  const numSpokes = 36;
  ctx.strokeStyle = "#2D3748";
  for (let i = 0; i < numSpokes; i++) {
    const angle = (i * Math.PI * 2) / numSpokes;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(angle) * (center - 20), center + Math.sin(angle) * (center - 20));
    ctx.stroke();
  }

  // Crosshair coordinate axes
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(center, 0);
  ctx.lineTo(center, size);
  ctx.moveTo(0, center);
  ctx.lineTo(size, center);
  ctx.stroke();

  // Grid tick marks
  ctx.strokeStyle = "#E2E8F0";
  ctx.fillStyle = "#A0AEC0";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 64; i < size; i += 64) {
    if (i === center) continue;
    // Ticks
    ctx.beginPath();
    ctx.moveTo(i, center - 6);
    ctx.lineTo(i, center + 6);
    ctx.moveTo(center - 6, i);
    ctx.lineTo(center + 6, i);
    ctx.stroke();
  }

  // Center optical circle
  ctx.fillStyle = "#1A202C";
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center, center, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Center CipherLens / Imaging emblem
  ctx.fillStyle = "#F59E0B";
  ctx.font = "bold 13px monospace";
  ctx.fillText("CIPHERLENS", center, center - 8);
  ctx.fillStyle = "#94A3B8";
  ctx.font = "10px monospace";
  ctx.fillText("CAL-512", center, center + 10);

  // Outer corner calibration markers
  const corners = [
    [24, 24],
    [size - 24, 24],
    [24, size - 24],
    [size - 24, size - 24],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.strokeStyle = "#06B6D4";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#06B6D4";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  return canvas.toDataURL("image/png");
}

export function generateSiemensStarTarget(size = 512): string {
  if (typeof document === "undefined") {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(0, 0, size, size);

  const center = size / 2;
  const numSpokes = 36;
  const spokeAngle = (Math.PI * 2) / numSpokes;

  for (let i = 0; i < numSpokes; i += 2) {
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, center - 16, i * spokeAngle, (i + 1) * spokeAngle);
    ctx.closePath();
    ctx.fillStyle = "#F5F5F5";
    ctx.fill();
  }

  // Concentric calibration rings
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1.5;
  for (const r of [60, 120, 180, 235]) {
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center fiducial
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(center, center, 6, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL("image/png");
}

export function generateFresnelZonePlate(size = 512): string {
  if (typeof document === "undefined") {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const center = size / 2;
  const k = 0.0018;

  for (let y = 0; y < size; y++) {
    const dy = y - center;
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const r = Math.sqrt(dx * dx + dy * dy);
      const chirp = 127.5 * (1.0 + Math.cos(k * r * r));
      const window = Math.max(0, Math.min(1, (center - r) / 16.0));
      const val = Math.min(255, Math.max(0, Math.round(chirp * window + 24 * (1 - window))));

      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

export function generateCheckerboardTarget(size = 512): string {
  if (typeof document === "undefined") {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const tile = 32;
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      ctx.fillStyle = ((x / tile + y / tile) % 2 === 0) ? "#F8F8F8" : "#141414";
      ctx.fillRect(x, y, tile, tile);
    }
  }

  ctx.strokeStyle = "#808080";
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  return canvas.toDataURL("image/png");
}

