// SEWA XAI — frontend/src/remotion/index.ts
// Remotion root — registers all compositions for:
//   - npx remotion render (server-side MP4/WebM export)
//   - npx remotion still  (thumbnail/frame export)
//   - @remotion/player    (in-browser playback)
//   - @remotion/lambda    (AWS Lambda scalable rendering)

import { registerRoot } from 'remotion';
import { RemotionRoot }  from './Root';

registerRoot(RemotionRoot);
