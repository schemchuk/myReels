export interface SubtitleSegment {
  text: string;
  startSec: number;
  endSec: number;
}

export function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?…]+[.!?…]+/g);
  if (!matches) {
    const trimmed = text.trim();
    return trimmed ? [trimmed] : [];
  }
  return matches.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
}

export function buildSubtitleSegments(
  sentences: string[],
  durationSec: number
): SubtitleSegment[] {
  if (sentences.length === 0) {
    return [];
  }

  const slice = durationSec / sentences.length;
  return sentences.map((text, index) => ({
    text,
    startSec: index * slice,
    endSec: (index + 1) * slice
  }));
}

function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)},${pad3(milliseconds)}`;
}

export function buildSrt(segments: SubtitleSegment[]): string {
  return segments
    .map((segment, index) => {
      const start = formatTimestamp(segment.startSec);
      const end = formatTimestamp(segment.endSec);
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n\n`;
    })
    .join('');
}
