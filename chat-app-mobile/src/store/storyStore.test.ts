import type { StoryGroup } from '../types';

jest.mock('../api/stories', () => ({
  storiesApi: {
    getFeed: jest.fn(),
    create: jest.fn(),
    markViewed: jest.fn(),
    react: jest.fn(),
    remove: jest.fn(),
  },
}));

import { useStoryStore, flattenStories } from './storyStore';
import { storiesApi } from '../api/stories';

const group = (authorId: string, ...storyIds: string[]): StoryGroup => ({
  authorId,
  hasUnviewed: true,
  lastStoryAt: '2026-06-20T10:00:00Z',
  stories: storyIds.map((id) => ({
    id,
    authorId,
    type: 'TEXT',
    content: 'hi',
    createdAt: '2026-06-20T10:00:00Z',
    expiresAt: '2026-06-21T10:00:00Z',
    viewedByMe: false,
    viewerCount: 0,
    reactions: {},
    myReaction: null,
  })),
});

describe('storyStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStoryStore.setState({ groups: [], loaded: false });
  });

  it('fetchFeed loads groups and marks loaded', async () => {
    (storiesApi.getFeed as jest.Mock).mockResolvedValue([group('alice', 's1')]);
    await useStoryStore.getState().fetchFeed();
    expect(useStoryStore.getState().groups).toHaveLength(1);
    expect(useStoryStore.getState().loaded).toBe(true);
  });

  it('createStory posts then refetches the feed', async () => {
    (storiesApi.create as jest.Mock).mockResolvedValue({});
    (storiesApi.getFeed as jest.Mock).mockResolvedValue([group('alice', 's1')]);
    await useStoryStore.getState().createStory({ type: 'TEXT', content: 'yo' });
    expect(storiesApi.create).toHaveBeenCalledWith({ type: 'TEXT', content: 'yo' });
    expect(useStoryStore.getState().groups).toHaveLength(1);
  });

  it('markViewed optimistically flags the story and clears hasUnviewed', async () => {
    useStoryStore.setState({ groups: [group('bob', 's1')] });
    (storiesApi.markViewed as jest.Mock).mockResolvedValue(undefined);
    await useStoryStore.getState().markViewed('s1');
    const g = useStoryStore.getState().groups[0];
    expect(g.stories[0].viewedByMe).toBe(true);
    expect(g.hasUnviewed).toBe(false);
  });

  it('reactToStory optimistically toggles the reaction on, then off on a second tap', async () => {
    useStoryStore.setState({ groups: [group('bob', 's1')] });
    (storiesApi.react as jest.Mock).mockResolvedValue({});

    await useStoryStore.getState().reactToStory('s1', '😮');
    let st = useStoryStore.getState().groups[0].stories[0];
    expect(st.myReaction).toBe('😮');
    expect(st.reactions['😮']).toBe(1);

    await useStoryStore.getState().reactToStory('s1', '😮');
    st = useStoryStore.getState().groups[0].stories[0];
    expect(st.myReaction).toBeNull();
    expect(st.reactions['😮']).toBeUndefined();
  });

  it('reactToStory rolls back the optimistic update on failure', async () => {
    useStoryStore.setState({ groups: [group('bob', 's1')] });
    (storiesApi.react as jest.Mock).mockRejectedValue(new Error('network'));

    await useStoryStore.getState().reactToStory('s1', '😮');
    const st = useStoryStore.getState().groups[0].stories[0];
    expect(st.myReaction).toBeNull();
  });

  it('deleteStory removes the story and drops empty groups', async () => {
    useStoryStore.setState({ groups: [group('alice', 's1')] });
    (storiesApi.remove as jest.Mock).mockResolvedValue(undefined);
    await useStoryStore.getState().deleteStory('s1');
    expect(useStoryStore.getState().groups).toHaveLength(0);
  });

  it('flattenStories returns all stories across groups in order', () => {
    const groups = [group('alice', 's1', 's2'), group('bob', 's3')];
    expect(flattenStories(groups).map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });
});
