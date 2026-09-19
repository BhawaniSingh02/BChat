import { create } from 'zustand';

interface CapturedPhoto {
  uri: string;
  name: string;
  mimeType: string;
}

interface CameraCaptureState {
  capturedPhoto: CapturedPhoto | null;
  setCapturedPhoto: (photo: CapturedPhoto) => void;
  consumeCapturedPhoto: () => CapturedPhoto | null;
}

// A tiny hand-off slot between CameraCaptureScreen and whichever ConversationScreen
// instance is on top of the stack when the user taps "Use Photo" — simpler and more
// typesafe than threading the photo through React Navigation's route params on a
// screen that's already mounted deeper in the stack.
export const useCameraCaptureStore = create<CameraCaptureState>((set, get) => ({
  capturedPhoto: null,
  setCapturedPhoto: (photo) => set({ capturedPhoto: photo }),
  consumeCapturedPhoto: () => {
    const photo = get().capturedPhoto;
    if (photo) set({ capturedPhoto: null });
    return photo;
  },
}));
