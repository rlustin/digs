import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import LoginScreen from "../login";
import { useAuthStore } from "@/stores/auth-store";

jest.mock("@/lib/discogs/oauth", () => ({
  login: jest.fn(),
}));

import { login } from "@/lib/discogs/oauth";

const mockLogin = login as jest.MockedFunction<typeof login>;

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: false, username: null });
  });

  it("renders app title and sign-in button", () => {
    render(<LoginScreen />);
    expect(screen.getByText("Digs")).toBeTruthy();
    expect(screen.getByText("Sign in with Discogs")).toBeTruthy();
  });

  it("renders tagline", () => {
    render(<LoginScreen />);
    expect(screen.getByText("Your records, always with you")).toBeTruthy();
  });

  it("calls login on button press and sets authenticated on success", async () => {
    mockLogin.mockResolvedValue({ username: "vinylhead" });

    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Sign in with Discogs"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().username).toBe("vinylhead");
  });

  it("shows error message on login failure", async () => {
    mockLogin.mockRejectedValue(new Error("OAuth cancelled"));

    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Sign in with Discogs"));

    await waitFor(() => {
      expect(screen.getByText("OAuth cancelled")).toBeTruthy();
    });
  });
});
