// Manual mock for expo-notifications — placed at the project root's __mocks__/ so
// Jest substitutes it automatically for every test (see __mocks__/react-native-webrtc.js
// for the same pattern). jest-expo's preset provides its own partial mocking for this
// module that inline jest.mock() factories in test files don't reliably override, so a
// root-level manual mock is the more robust way to get controllable, spy-able methods.

module.exports = {
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[mock]' })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5 },
};
