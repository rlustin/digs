import React from "react";
import { render, screen } from "@testing-library/react-native";
import { EmptyState } from "../ui/empty-state";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText("No items")).toBeTruthy();
  });

  it("renders message when provided", () => {
    render(<EmptyState title="No items" message="Try again later" />);
    expect(screen.getByText("Try again later")).toBeTruthy();
  });

  it("does not render message when not provided", () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByText("Try again later")).toBeNull();
  });
});
