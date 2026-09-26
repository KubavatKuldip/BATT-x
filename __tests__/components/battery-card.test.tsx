import { render, screen } from "@testing-library/react";
import { BatteryCard } from "@/components/dashboard/battery-card";

describe("BatteryCard", () => {
  it("renders the battery level percentage", () => {
    render(<BatteryCard percentage={75} status="normal" />);
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Battery Level")).toBeInTheDocument();
  });

  it("rounds the percentage to the nearest integer", () => {
    render(<BatteryCard percentage={66.7} status="normal" />);
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("shows 'Charging in progress' when isCharging is true", () => {
    render(<BatteryCard percentage={50} isCharging status="normal" />);
    expect(screen.getByText("Charging in progress")).toBeInTheDocument();
  });

  it("does not show 'Charging in progress' when not charging", () => {
    render(<BatteryCard percentage={50} status="normal" />);
    expect(screen.queryByText("Charging in progress")).not.toBeInTheDocument();
  });

  it("renders without crashing for each status", () => {
    const { rerender, container } = render(<BatteryCard percentage={20} status="normal" />);
    expect(container.firstChild).toBeTruthy();
    rerender(<BatteryCard percentage={20} status="warning" />);
    expect(container.firstChild).toBeTruthy();
    rerender(<BatteryCard percentage={20} status="critical" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(
      <BatteryCard percentage={50} status="normal" className="extra-class" />
    );
    expect(container.querySelector(".extra-class")).toBeInTheDocument();
  });
});
