import { splitIntoSentences, buildSubtitleSegments, buildSrt } from './subtitles';

describe('splitIntoSentences', () => {
  it('splits on sentence-ending punctuation and trims whitespace', () => {
    const result = splitIntoSentences('Привіт. Як справи? Чудово!');
    expect(result).toEqual(['Привіт.', 'Як справи?', 'Чудово!']);
  });

  it('handles an ellipsis as a sentence boundary', () => {
    const result = splitIntoSentences('Зачекайте... Це працює.');
    expect(result).toEqual(['Зачекайте...', 'Це працює.']);
  });

  it('returns the whole text as one sentence when there is no punctuation', () => {
    const result = splitIntoSentences('просто текст без розділових знаків');
    expect(result).toEqual(['просто текст без розділових знаків']);
  });

  it('drops empty fragments caused by extra whitespace', () => {
    const result = splitIntoSentences('Перше.   Друге.');
    expect(result).toEqual(['Перше.', 'Друге.']);
  });
});

describe('buildSubtitleSegments', () => {
  it('divides the duration evenly across all sentences', () => {
    const segments = buildSubtitleSegments(['Перше.', 'Друге.', 'Третє.'], 9);

    expect(segments).toEqual([
      { text: 'Перше.', startSec: 0, endSec: 3 },
      { text: 'Друге.', startSec: 3, endSec: 6 },
      { text: 'Третє.', startSec: 6, endSec: 9 }
    ]);
  });

  it('returns an empty array when there are no sentences', () => {
    expect(buildSubtitleSegments([], 10)).toEqual([]);
  });
});

describe('buildSrt', () => {
  it('renders segments as a standard .srt file', () => {
    const srt = buildSrt([
      { text: 'Перше.', startSec: 0, endSec: 3 },
      { text: 'Друге.', startSec: 3, endSec: 6.5 }
    ]);

    expect(srt).toBe(
      '1\n00:00:00,000 --> 00:00:03,000\nПерше.\n\n' +
      '2\n00:00:03,000 --> 00:00:06,500\nДруге.\n\n'
    );
  });
});
