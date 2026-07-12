import dicomParser from 'dicom-parser';
import { init as csInit } from '@cornerstonejs/core';
import { init as csToolsInit, addTool } from '@cornerstonejs/tools';
import wadoImageLoader from '@cornerstonejs/dicom-image-loader';
import { WindowLevelTool, PanTool, ZoomTool, LengthTool, RectangleROITool } from '@cornerstonejs/tools';

let initialized = false;

export async function initCornerstone(): Promise<void> {
  if (initialized) return;

  (wadoImageLoader as any).external.dicomParser = dicomParser;

  (wadoImageLoader as any).configure({
    useWebWorkers: true,
    maxWebWorkers: Math.min(navigator.hardwareConcurrency || 1, 4),
    decodeConfig: { convertFloatPixelDataToInt: false },
  });

  csInit({
    gpuTier: { tier: 2 },
    isMobile: false,
    rendering: { preferSizeOverAccuracy: false, useCPURendering: false, strictZSpacingForVolumeViewport: false },
  });

  await csToolsInit();

  addTool(WindowLevelTool);
  addTool(PanTool);
  addTool(ZoomTool);
  addTool(LengthTool);
  addTool(RectangleROITool);

  initialized = true;
}
