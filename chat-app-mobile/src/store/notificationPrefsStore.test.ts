import { useNotificationPrefsStore } from './notificationPrefsStore';

describe('notificationPrefsStore', () => {
  beforeEach(() => {
    useNotificationPrefsStore.setState({ enabled: true, sound: true });
  });

  it('defaults to notifications and sound both on', () => {
    expect(useNotificationPrefsStore.getState().enabled).toBe(true);
    expect(useNotificationPrefsStore.getState().sound).toBe(true);
  });

  it('setEnabled toggles the master switch independently of sound', () => {
    useNotificationPrefsStore.getState().setEnabled(false);
    expect(useNotificationPrefsStore.getState().enabled).toBe(false);
    expect(useNotificationPrefsStore.getState().sound).toBe(true);
  });

  it('setSound toggles sound independently of the master switch', () => {
    useNotificationPrefsStore.getState().setSound(false);
    expect(useNotificationPrefsStore.getState().sound).toBe(false);
    expect(useNotificationPrefsStore.getState().enabled).toBe(true);
  });
});
