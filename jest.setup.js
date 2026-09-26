// jest.setup.js — runs after the test framework is set up
require("@testing-library/jest-dom");

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return "/";
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock next-auth/react
jest.mock("next-auth/react", () => ({
  useSession() {
    return { data: null, status: "unauthenticated" };
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}));

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
  ThemeProvider: ({ children }) => children,
}));

// Mock framer-motion: passthrough so tests don't care about animation
jest.mock("framer-motion", () => {
  const React = require("react");
  const passthrough = (Component) => {
    const Mocked = React.forwardRef((props, ref) => {
      const { children, ...rest } = props;
      return React.createElement(Component, { ...rest, ref }, children);
    });
    Mocked.displayName = `motion.${Component}`;
    return Mocked;
  };
  const motionProxy = new Proxy(
    {},
    {
      get: (_, prop) => passthrough(String(prop)),
    }
  );
  return {
    __esModule: true,
    motion: motionProxy,
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
    useInView: () => true,
  };
});

// Mock lucide-react to a tiny stub
jest.mock("lucide-react", () => {
  const React = require("react");
  return new Proxy(
    {},
    {
      get: () => {
        const Stub = (props) => React.createElement("svg", { "data-testid": "lucide-icon", ...props });
        return Stub;
      },
    }
  );
});

// Suppress noisy act() warnings — this runs after Jest is set up
beforeAll(() => {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("not wrapped in act(") ||
        args[0].includes("Warning: An update to"))
    ) {
      return;
    }
    originalError(...args);
  };
});
