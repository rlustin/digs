import { useAuthStore } from "../auth-store";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: false,
      username: null,
    });
  });

  it("has correct initial state", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.username).toBeNull();
  });

  it("setAuthenticated sets isAuthenticated and username", () => {
    useAuthStore.getState().setAuthenticated("testuser");
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.username).toBe("testuser");
  });

  it("clearAuth resets to initial state", () => {
    useAuthStore.getState().setAuthenticated("testuser");
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.username).toBeNull();
  });
});
