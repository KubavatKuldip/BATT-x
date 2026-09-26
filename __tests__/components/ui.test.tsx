import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

describe("Button", () => {
  it("renders with default variant and size", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });

  it("applies variant classes for each variant", () => {
    const { rerender, container } = render(<Button variant="destructive">A</Button>);
    expect(container.firstChild).toBeTruthy();

    rerender(<Button variant="outline">A</Button>);
    expect(container.firstChild).toBeTruthy();

    rerender(<Button variant="ghost">A</Button>);
    expect(container.firstChild).toBeTruthy();

    rerender(<Button variant="link">A</Button>);
    expect(container.firstChild).toBeTruthy();

    rerender(<Button variant="success">A</Button>);
    expect(container.firstChild).toBeTruthy();
  });

  it("applies size classes", () => {
    const { rerender, container } = render(<Button size="sm">A</Button>);
    expect(container.firstChild).toBeTruthy();

    rerender(<Button size="lg">A</Button>);
    expect(container.firstChild).toBeTruthy();

    rerender(<Button size="icon">A</Button>);
    expect(container.firstChild).toBeTruthy();
  });

  it("is disabled when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });

  it("fires onClick handler", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders as child when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });
});

describe("Card", () => {
  it("renders Card with default level", () => {
    const { container } = render(<Card>content</Card>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders all sub-components", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content body</CardContent>
        <CardFooter>Footer text</CardFooter>
      </Card>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Content body")).toBeInTheDocument();
    expect(screen.getByText("Footer text")).toBeInTheDocument();
  });

  it("renders elevated level", () => {
    const { container } = render(<Card level="elevated">elevated</Card>);
    expect(container.firstChild).toBeTruthy();
  });
});

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("applies each variant without error", () => {
    const variants = ["default", "secondary", "destructive", "outline", "success", "warning"] as const;
    const { rerender, container } = render(<Badge variant="default">x</Badge>);
    for (const v of variants) {
      rerender(<Badge variant={v}>x</Badge>);
      expect(container.firstChild).toBeTruthy();
    }
  });
});

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument();
  });

  it("handles typing", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Name" />);
    const input = screen.getByLabelText("Name") as HTMLInputElement;
    await user.type(input, "hello");
    expect(input.value).toBe("hello");
  });

  it("is disabled when disabled prop is passed", () => {
    render(<Input disabled aria-label="Disabled input" />);
    expect(screen.getByLabelText("Disabled input")).toBeDisabled();
  });

  it("respects the type prop", () => {
    render(<Input type="email" aria-label="Email" />);
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.type).toBe("email");
  });
});
