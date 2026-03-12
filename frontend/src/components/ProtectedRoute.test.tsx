import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProtectedRoute from "./ProtectedRoute";

const mockUseAuth = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../lib/mvpBypass", () => ({
  isMvpBypassSessionActive: () => false,
}));

vi.mock("../lib/supabaseClient", () => ({
  isMvpBypassEnabled: false,
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("renders the child route when a session exists", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      loading: false,
      mvpBypassActive: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to login when unauthenticated", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      loading: false,
      mvpBypassActive: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
