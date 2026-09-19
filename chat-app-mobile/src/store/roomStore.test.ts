import { muteUntilFor } from './roomStore';

describe('muteUntilFor', () => {
  it('8H resolves to a timestamp roughly 8 hours in the future', () => {
    const before = Date.now();
    const result = new Date(muteUntilFor('8H')).getTime();
    const after = Date.now();

    expect(result).toBeGreaterThan(before);
    expect(result).toBeGreaterThanOrEqual(before + 8 * 3600 * 1000);
    expect(result).toBeLessThanOrEqual(after + 8 * 3600 * 1000);
  });

  it('1W resolves to a timestamp roughly 7 days in the future', () => {
    const before = Date.now();
    const result = new Date(muteUntilFor('1W')).getTime();
    const after = Date.now();

    expect(result).toBeGreaterThan(before);
    expect(result).toBeGreaterThanOrEqual(before + 7 * 24 * 3600 * 1000);
    expect(result).toBeLessThanOrEqual(after + 7 * 24 * 3600 * 1000);
  });

  it('ALWAYS resolves to a far-future timestamp', () => {
    const result = new Date(muteUntilFor('ALWAYS')).getTime();

    expect(result).toBeGreaterThan(Date.now());
    // Should be effectively "forever" — well beyond any real mute duration.
    expect(result).toBeGreaterThan(Date.now() + 365 * 24 * 3600 * 1000);
  });

  it('every duration option returns a timestamp in the future, not now or the past', () => {
    const durations: Array<'8H' | '1W' | 'ALWAYS'> = ['8H', '1W', 'ALWAYS'];
    for (const duration of durations) {
      expect(new Date(muteUntilFor(duration)).getTime()).toBeGreaterThan(Date.now());
    }
  });
});
