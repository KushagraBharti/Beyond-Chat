import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth }));

import LoginPage from "./LoginPage";

describe("WorkOS login state", () => {
  beforeEach(() => useAuth.mockReset());

  it("disables activation when the backend reports WorkOS unavailable", () => {
    useAuth.mockReturnValue({ session: null, loading: false, available: false, error: "WorkOS authentication is not configured.", refreshSession: vi.fn() });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Continue with WorkOS" })).toBeDisabled();
    expect(screen.getByText(/backend WorkOS credentials/i)).toBeInTheDocument();
  });

  it("allows a failed session to be checked again", () => {
    const refreshSession = vi.fn().mockResolvedValue(null);
    useAuth.mockReturnValue({ session: null, loading: false, available: true, error: "Your session ended.", refreshSession });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Check session again" }));
    expect(refreshSession).toHaveBeenCalledOnce();
  });
});
