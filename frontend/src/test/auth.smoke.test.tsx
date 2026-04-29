import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import ProtectedRoute from "../components/ProtectedRoute";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1" } },
    loading: false,
  }),
}));

describe("ProtectedRoute", () => {
  test("renders children when an authenticated session exists", () => {
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>protected content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("protected content")).toBeInTheDocument();
  });
});
