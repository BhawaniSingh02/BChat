import { useDraftStore } from './draftStore';

describe('draftStore', () => {
  beforeEach(() => {
    useDraftStore.setState({ drafts: {} });
  });

  it('setDraft stores non-blank text keyed by roomId', () => {
    useDraftStore.getState().setDraft('room-1', 'hello there');
    expect(useDraftStore.getState().drafts['room-1']).toBe('hello there');
  });

  it('setDraft with blank/whitespace text removes any existing draft for that room', () => {
    useDraftStore.setState({ drafts: { 'room-1': 'hi' } });
    useDraftStore.getState().setDraft('room-1', '   ');
    expect(useDraftStore.getState().drafts['room-1']).toBeUndefined();
  });

  it('keeps drafts for different rooms independent', () => {
    useDraftStore.getState().setDraft('room-1', 'for room 1');
    useDraftStore.getState().setDraft('dm:conv-2', 'for the dm');
    expect(useDraftStore.getState().drafts).toEqual({
      'room-1': 'for room 1',
      'dm:conv-2': 'for the dm',
    });
  });

  it('clearDraft removes only the given room', () => {
    useDraftStore.setState({ drafts: { 'room-1': 'a', 'room-2': 'b' } });
    useDraftStore.getState().clearDraft('room-1');
    expect(useDraftStore.getState().drafts).toEqual({ 'room-2': 'b' });
  });

  it('clearDraft on a room with no draft is a no-op', () => {
    useDraftStore.setState({ drafts: { 'room-2': 'b' } });
    useDraftStore.getState().clearDraft('room-1');
    expect(useDraftStore.getState().drafts).toEqual({ 'room-2': 'b' });
  });
});
