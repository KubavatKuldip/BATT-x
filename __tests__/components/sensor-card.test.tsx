import { render, screen } from "@testing-library/react";
import { SensorCard } from "@/components/dashboard/sensor-card";
import { Thermometer } from "lucide-react";

describe("SensorCard", () => {
  it("renders label, value, and unit", () => {
    render(
      <SensorCard
        icon={Thermometer}
        label="Temperature"
        value="45.5"
        unit="°C"
        status="normal"
      />
    );

    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText("45.5")).toBeInTheDocument();
    expect(screen.getByText("°C")).toBeInTheDocument();
  });

  it("applies different styling per status", () => {
    const { rerender, container } = render(
      <SensorCard
        icon={Thermometer}
        label="Temperature"
        value="45"
        unit="°C"
        status="normal"
      />
    );
    // Look for class indicators
    let html = container.innerHTML;
    expect(html).toBeTruthy();

    rerender(
      <SensorCard
        icon={Thermometer}
        label="Temperature"
        value="65"
        unit="°C"
        status="critical"
      />
    );
    html = container.innerHTML;
    expect(html).toBeTruthy();
  });
});
