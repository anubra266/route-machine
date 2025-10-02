# routing-machine

A comprehensive router state machine for client-side navigation.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Route Patterns](#route-patterns)
- [Navigation](#navigation)
- [Navigation Guards](#navigation-guards)
- [Route Metadata](#route-metadata)
- [Navigation Callbacks](#navigation-callbacks)
- [Query Parameters](#query-parameters)
- [Active Route Detection](#active-route-detection)
- [Configuration](#configuration)
- [Nested Routes](#nested-routes)
- [Real-World Examples](#real-world-examples)
- [API Reference](#api-reference)
- [License](#license)

## Features

- **🎯 Declarative routes** with patterns, parameters, and metadata
- **🔒 Navigation guards** with clean return value API (`false` to block, `string` to redirect)
- **🛡️ Initial load protection** - guards run on ALL navigation including page loads
- **📊 Rich route context** - `location.meta`, `location.name`, `location.params`
- **🔄 History management** - back/forward with proper URL updates
- **🚨 Catch-all routes** - `"*"` and `"/admin/*"` patterns for 404 pages
- **📋 Route priority** - most specific routes match first
- **🔗 Smart URL handling** - absolute vs relative path resolution
- **⚡ Loading states** - `router.navigating` for smooth transitions
- **📍 Navigation tracking** - source, type, and metadata in all callbacks
- **🔧 Hash routing** - `#/path` for static hosting
- **📂 Base path support** - subdirectory deployments
- **🎨 TypeScript** - fully typed with excellent inference

## Installation

```bash
npm install routing-machine
```

## Quick Start

```typescript
import * as router from "routing-machine"
import { normalizeProps, useMachine } from "@zag-js/react"

export function useRouter(options = {}) {
  const service = useMachine(router.machine({
    id: "router",
    routes: [
      { path: "/", name: "home" },
      { path: "/users/:id", name: "user" },
    ],
    ...options,
  }))

  return router.connect(service, normalizeProps)
}

function App() {
  const router = useRouter()

  return (
    <div {...router.getRootProps()}>
      <nav>
        <a {...router.getLinkProps({ to: "/" })}>Home</a>
        <a {...router.getLinkProps({ to: "/users/123" })}>User</a>
      </nav>

      <main {...router.getOutletProps()}>
        {router.location.name === "home" && <HomePage />}
        {router.location.name === "user" && <UserPage />}
      </main>
    </div>
  )
}
```

## Core Concepts

### Route Location Object

Every navigation provides a `RouteLocation` with all route information:

```typescript
router.location = {
  pathname: "/users/123", // URL path
  search: "?tab=profile", // Query string
  hash: "#section1", // URL hash
  params: { id: "123" }, // Route parameters
  query: { tab: "profile" }, // Parsed query parameters
  meta: { requiresAuth: true }, // Route metadata
  name: "user", // Route name
};
```

### Navigation Sources & Types

All navigation is categorized by source and type:

```typescript
// Navigation sources
"initial"; // Page load, refresh, direct URL
"programmatic"; // router.push(), router.navigate()
"user"; // Link clicks (getLinkProps)
"browser"; // Browser back/forward buttons

// Navigation types
"initial"; // Initial page load
"push"; // Add new history entry
"replace"; // Replace current history entry
"back"; // Go back in history
"forward"; // Go forward in history
```

## Route Patterns

### Basic Routes

```typescript
const routes = [
  { path: "/", name: "home" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" },
];
```

### Parameterized Routes

```typescript
const routes = [
  { path: "/users/:id", name: "user" },
  { path: "/posts/:slug", name: "post" },
  { path: "/api/:version/docs", name: "api-docs" },
];

// Access parameters
router.location.params.id; // "123"
router.location.params.slug; // "hello-world"
router.location.params.version; // "v2"
```

### Catch-All Routes

Catch-all routes handle unmatched paths and must be defined **last** in your routes array:

```typescript
const routes = [
  // Specific routes first
  { path: "/", name: "home" },
  { path: "/users/:id", name: "user" },

  // Section-specific catch-all
  { path: "/admin/*", name: "admin-404", meta: { layout: "admin" } },
  { path: "/api/*", name: "api-404", meta: { layout: "api" } },

  // Global catch-all (must be last!)
  { path: "*", name: "not-found", meta: { layout: "main" } },
]

// Usage in components
{router.location.name === "not-found" && <NotFoundPage />}
{router.location.name === "admin-404" && <AdminNotFound />}
```

## Navigation

### Programmatic Navigation

```typescript
const router = useRouter();

// Add to history (most common)
router.push("/about");
router.push("/users/456", { from: "search" });

// Replace current entry
router.replace("/login");
router.replace("/home", { replaced: true });

// Navigate with options
router.navigate("/search", {
  replace: false,
  state: { searchSource: "header" },
});

// History navigation
router.back(); // Go back one step
router.forward(); // Go forward one step
router.go(-2); // Go back 2 steps
router.go(3); // Go forward 3 steps
```

### Link Navigation

```typescript
// Basic links
<a {...router.getLinkProps({ to: "/" })}>Home</a>
<a {...router.getLinkProps({ to: "/users/123" })}>User</a>

// Links with options
<a {...router.getLinkProps({
  to: "/login",
  replace: true,
  state: { returnTo: router.location.pathname }
})}>Login</a>

// External links (work normally)
<a href="https://external.com">External</a>
<a {...router.getLinkProps({ to: "/download", preventDefault: true })}
   onClick={handleDownload}>Download</a>
```

### Navigation State

```typescript
const router = useRouter();

// Current state
router.location; // Full location object
router.previousLocation; // Previous location (or null)
router.navigating; // Boolean: navigation in progress

// History state
router.canGoBack; // Boolean: can go back
router.canGoForward; // Boolean: can go forward

// Route info
router.currentRouteName; // Current route name
router.currentRouteMeta; // Current route metadata
```

## Navigation Guards

Navigation guards run on **ALL navigation types** including initial page loads, making them perfect for authentication
and authorization.

### Return Value API

```typescript
const router = useRouter({
  onBeforeNavigate: (details) => {
    return false; // Block navigation
    return "/login"; // Redirect to different route
    return true; // Explicitly allow
    return undefined; // Implicitly allow (default)
  },
});
```

### Authentication Guards

```typescript
const router = useRouter({
  routes: [
    { path: "/", name: "home", meta: { public: true } },
    { path: "/profile", name: "profile", meta: { requiresAuth: true } },
    {
      path: "/admin",
      name: "admin",
      meta: { requiresAuth: true, role: "admin" },
    },
    { path: "/login", name: "login", meta: { guestOnly: true } },
  ],
  onBeforeNavigate: (details) => {
    // Guest-only pages (redirect authenticated users)
    if (details.to.meta?.guestOnly && isAuthenticated()) {
      return "/profile";
    }

    // Protected pages (redirect unauthenticated users)
    if (details.to.meta?.requiresAuth && !isAuthenticated()) {
      return "/login";
    }

    // Role-based access
    if (details.to.meta?.role && !hasRole(details.to.meta.role)) {
      return "/access-denied";
    }

    // Allow navigation
  },
});
```

### Form Protection Guards

```typescript
const router = useRouter({
  routes: [
    { path: "/edit-profile", meta: { hasForm: true } },
    { path: "/create-post", meta: { hasForm: true } },
  ],
  onBeforeNavigate: (details) => {
    // Warn about unsaved changes
    if (details.from?.meta?.hasForm && hasUnsavedChanges()) {
      const shouldLeave = confirm("You have unsaved changes. Continue?");
      if (!shouldLeave) {
        return false; // User chose to stay
      }
    }
  },
});
```

### Navigation Context

Guards receive complete navigation context:

```typescript
onBeforeNavigate: (details) => {
  console.log({
    from: details.from?.pathname, // Where coming from
    to: details.to.pathname, // Where going to
    type: details.type, // "initial", "push", "back", etc.
    source: details.source, // "browser", "programmatic", "user"

    // Route information
    fromRoute: details.from?.name, // "user-profile"
    toRoute: details.to.name, // "user-settings"
    fromMeta: details.from?.meta, // { requiresAuth: true }
    toMeta: details.to.meta, // { requiresAuth: true, hasForm: true }
  });
};
```

## Route Metadata

Route metadata enables declarative routing patterns:

### Metadata Definition

```typescript
const routes = [
  {
    path: "/dashboard",
    name: "dashboard",
    meta: {
      title: "Dashboard",
      requiresAuth: true,
      layout: "app",
      analytics: { section: "main" },
      breadcrumb: "Dashboard",
    },
  },
  {
    path: "/users/:id/settings",
    name: "user-settings",
    meta: {
      title: "User Settings",
      requiresAuth: true,
      hasForm: true,
      layout: "users",
      breadcrumb: (params) => `User ${params.id} Settings`,
    },
  },
];
```

### Accessing Metadata

```typescript
// In components
router.location.meta.title; // "Dashboard"
router.location.meta.requiresAuth; // true
router.location.meta.layout; // "app"

// In navigation callbacks
onNavigate: (details) => {
  document.title = details.to.meta?.title || "App";

  if (details.to.meta?.analytics) {
    analytics.track("page_view", details.to.meta.analytics);
  }
};
```

### Layout-Based Rendering

```typescript
function App() {
  const router = useRouter()

  return (
    <div {...router.getRootProps()}>
      <main {...router.getOutletProps()}>
        {router.location.meta?.layout === "app" && <AppLayout />}
        {router.location.meta?.layout === "users" && <UsersLayout />}
        {router.location.meta?.layout === "admin" && <AdminLayout />}
        {!router.location.meta?.layout && <DefaultLayout />}
      </main>
    </div>
  )
}
```

## Navigation Callbacks

### Lifecycle Callbacks

```typescript
const router = useRouter({
  onNavigationStart: (details) => {
    // Called when navigation begins
    setGlobalLoading(true);
    console.log(`Starting navigation to ${details.to.pathname}`);
  },

  onNavigate: (details) => {
    // Called after successful navigation
    document.title = details.to.meta?.title || "App";

    // Analytics tracking
    analytics.track("page_view", {
      route: details.to.name,
      path: details.to.pathname,
      title: details.to.meta?.title,
      fromRoute: details.from?.name,
      navigationType: details.type,
    });
  },

  onNavigationEnd: (details) => {
    // Called when navigation fully completes
    setGlobalLoading(false);

    // Scroll management
    if (details.to.meta?.scrollToElement) {
      document
        .getElementById(details.to.meta.scrollToElement)
        ?.scrollIntoView();
    }
  },

  onNavigationError: (error, details) => {
    // Called when navigation fails
    console.error("Navigation error:", error.message);
    showErrorToast(`Failed to navigate to ${details?.to?.pathname}`);
  },
});
```

### Loading States

```typescript
function App() {
  const router = useRouter({
    onNavigationStart: () => setLoading(true),
    onNavigationEnd: () => setLoading(false),
  })

  return (
    <div {...router.getRootProps()}>
      {/* Global loading indicator */}
      {router.navigating && (
        <div className="loading-bar">
          <div className="progress" />
        </div>
      )}

      <main {...router.getOutletProps()}>
        {router.navigating ? (
          <div className="page-loading">
            Loading {router.currentRouteMeta?.title}...
          </div>
        ) : (
          <RouterOutlet />
        )}
      </main>
    </div>
  )
}
```

## Query Parameters

### Reading Query Parameters

```typescript
// URL: /search?q=javascript&tags=react&tags=vue&category=tutorial
const router = useRouter();

router.location.search; // "?q=javascript&tags=react&tags=vue&category=tutorial"
router.location.query.q; // "javascript"
router.location.query.tags; // ["react", "vue"]
router.location.query.category; // "tutorial"
```

### Navigating with Query Parameters

```typescript
// Set query parameters
router.push("/search?q=typescript&sort=date");
router.navigate("/products?category=electronics&price=100-500");

// Preserve existing parameters
const currentQuery = new URLSearchParams(router.location.search);
currentQuery.set("page", "2");
router.push(`/products?${currentQuery.toString()}`);

// Clear query parameters
router.push("/search"); // No query string = cleared
```

## Active Route Detection

### Basic Active Detection

```typescript
const router = useRouter();

// Exact match
router.isActive("/"); // true only for exact "/"
router.isActive("/about"); // true only for exact "/about"

// Prefix match (exact=false)
router.isActive("/users", false); // true for "/users", "/users/123", "/users/123/settings"
router.isActive("/admin", false); // true for any "/admin/*" route
```

### Active Link Styling

```typescript
function Navigation() {
  const router = useRouter()

  return (
    <nav>
      <a
        {...router.getLinkProps({ to: "/" })}
        className={router.isActive("/") ? "active" : ""}
      >
        Home
      </a>

      <a
        {...router.getLinkProps({ to: "/users" })}
        className={router.isActive("/users", false) ? "active" : ""}
      >
        Users
      </a>
    </nav>
  )
}

// CSS
.active {
  color: blue;
  font-weight: bold;
}

/* Or use data attributes from getLinkProps */
a[data-active="true"] { color: blue; }
a[data-current="true"] { font-weight: bold; }
```

## Configuration

### Hash Routing

For static hosting environments that don't support history API:

```typescript
const router = useRouter({
  hashRouting: true, // Use #/path instead of /path
  basePath: "/app", // Optional base path
});

// URLs become: https://example.com/app#/users/123
```

### Base Path

For deploying in subdirectories:

```typescript
const router = useRouter({
  basePath: "/my-app", // App deployed at /my-app
});

// Routes work correctly:
// /my-app/ → matches "/"
// /my-app/about → matches "/about"
```

### Scroll Behavior

```typescript
const router = useRouter({
  scrollToTop: true, // Scroll to top on navigation (default: true)
  scrollRestoration: "manual", // Browser scroll restoration (default: "auto")
});
```

## Nested Routes

While the router uses flat route definitions, you can achieve nested behavior using metadata-driven layouts:

### Nested Route Structure

```typescript
const routes = [
  // Parent routes
  {
    path: "/users",
    name: "users-index",
    meta: { layout: "users", section: "index" },
  },
  {
    path: "/admin",
    name: "admin-index",
    meta: { layout: "admin", section: "index" },
  },

  // Child routes with full paths
  {
    path: "/users/:id",
    name: "user-profile",
    meta: { layout: "users", section: "detail", tab: "profile" },
  },
  {
    path: "/users/:id/settings",
    name: "user-settings",
    meta: { layout: "users", section: "detail", tab: "settings" },
  },
  {
    path: "/users/:id/posts",
    name: "user-posts",
    meta: { layout: "users", section: "detail", tab: "posts" },
  },

  // Admin child routes
  {
    path: "/admin/users",
    name: "admin-users",
    meta: { layout: "admin", section: "users" },
  },
  {
    path: "/admin/settings",
    name: "admin-settings",
    meta: { layout: "admin", section: "settings" },
  },
];
```

### Layout Components

```typescript
function App() {
  const router = useRouter({ routes })

  return (
    <div {...router.getRootProps()}>
      <main {...router.getOutletProps()}>
        {router.location.meta?.layout === "users" && <UsersLayout />}
        {router.location.meta?.layout === "admin" && <AdminLayout />}
        {!router.location.meta?.layout && <DefaultLayout />}
      </main>
    </div>
  )
}

function UsersLayout() {
  const router = useRouter()
  const userId = router.location.params.id

  return (
    <div className="users-layout">
      <aside>
        <h2>Users</h2>
        {userId && (
          <nav>
            <a {...router.getLinkProps({ to: `/users/${userId}` })}>Profile</a>
            <a {...router.getLinkProps({ to: `/users/${userId}/settings` })}>Settings</a>
            <a {...router.getLinkProps({ to: `/users/${userId}/posts` })}>Posts</a>
          </nav>
        )}
      </aside>

      <main>
        {router.location.section === "index" && <UsersIndex />}
        {router.location.section === "detail" && (
          <UserDetailSection tab={router.location.meta?.tab} userId={userId} />
        )}
      </main>
    </div>
  )
}
```

## Real-World Examples

### Complete Authentication Flow

```typescript
function useAuthenticatedRouter() {
  return useRouter({
    routes: [
      // Public routes
      { path: "/", name: "home", meta: { title: "Home", public: true } },
      { path: "/about", name: "about", meta: { title: "About", public: true } },
      {
        path: "/login",
        name: "login",
        meta: { title: "Login", guestOnly: true },
      },
      {
        path: "/register",
        name: "register",
        meta: { title: "Register", guestOnly: true },
      },

      // Protected routes
      {
        path: "/profile",
        name: "profile",
        meta: { title: "Profile", requiresAuth: true },
      },
      {
        path: "/settings",
        name: "settings",
        meta: { title: "Settings", requiresAuth: true, hasForm: true },
      },

      // Admin routes
      {
        path: "/admin",
        name: "admin",
        meta: { title: "Admin", requiresAuth: true, role: "admin" },
      },
      {
        path: "/admin/users",
        name: "admin-users",
        meta: { title: "Manage Users", requiresAuth: true, role: "admin" },
      },

      // Error routes
      {
        path: "/access-denied",
        name: "access-denied",
        meta: { title: "Access Denied", public: true },
      },
      {
        path: "*",
        name: "not-found",
        meta: { title: "Page Not Found", public: true },
      },
    ],

    onBeforeNavigate: (details) => {
      const { to, from, type } = details;

      console.log(
        `🚀 Navigation: ${from?.name || "initial"} → ${to.name} (${type})`
      );

      // Guest-only redirect (login page when already authenticated)
      if (to.meta?.guestOnly && isAuthenticated()) {
        return "/profile";
      }

      // Authentication required
      if (to.meta?.requiresAuth && !isAuthenticated()) {
        // Save intended destination
        sessionStorage.setItem("redirectAfterLogin", to.pathname);
        return "/login";
      }

      // Role-based authorization
      if (to.meta?.role && !hasRole(to.meta.role)) {
        return "/access-denied";
      }

      // Form protection
      if (from?.meta?.hasForm && hasUnsavedChanges()) {
        const shouldLeave = confirm(
          `You have unsaved changes. Leave ${from.meta?.title}?`
        );
        return shouldLeave ? undefined : false;
      }

      // Allow navigation
    },

    onNavigate: (details) => {
      // Update document title
      document.title = details.to.meta?.title + " | MyApp";

      // Clear any error states
      clearErrors();

      // Analytics tracking
      analytics.track("page_view", {
        route: details.to.name,
        path: details.to.pathname,
        title: details.to.meta?.title,
        requiresAuth: details.to.meta?.requiresAuth,
        userRole: getCurrentUserRole(),
        fromRoute: details.from?.name,
        navigationType: details.type,
      });

      // Handle post-login redirect
      if (details.to.name === "login" && details.type === "initial") {
        const redirectPath = sessionStorage.getItem("redirectAfterLogin");
        if (redirectPath) {
          sessionStorage.removeItem("redirectAfterLogin");
          setTimeout(() => router.replace(redirectPath), 100);
        }
      }
    },

    onNavigationStart: (details) => {
      setGlobalLoading(true);

      // Different loading states based on route
      const loadingType = details.to.meta?.loadingType || "default";
      setLoadingType(loadingType);
    },

    onNavigationEnd: (details) => {
      setGlobalLoading(false);

      // Focus management for accessibility
      if (details.to.meta?.focusElement) {
        document.querySelector(details.to.meta.focusElement)?.focus();
      }
    },
  });
}
```

### Multi-Section Application

```typescript
function useSectionedRouter() {
  return useRouter({
    routes: [
      // Marketing site
      { path: "/", name: "marketing-home", meta: { section: "marketing", title: "Welcome" } },
      { path: "/pricing", name: "pricing", meta: { section: "marketing", title: "Pricing" } },
      { path: "/docs", name: "docs", meta: { section: "marketing", title: "Documentation" } },

      // Application
      { path: "/app", name: "app-dashboard", meta: { section: "app", title: "Dashboard", requiresAuth: true } },
      { path: "/app/projects", name: "app-projects", meta: { section: "app", title: "Projects", requiresAuth: true } },
      { path: "/app/settings", name: "app-settings", meta: { section: "app", title: "Settings", requiresAuth: true } },

      // Admin panel
      { path: "/admin", name: "admin-dashboard", meta: { section: "admin", title: "Admin", requiresAuth: true, role: "admin" } },
      { path: "/admin/users", name: "admin-users", meta: { section: "admin", title: "Users", requiresAuth: true, role: "admin" } },

      // Section-specific 404s
      { path: "/app/*", name: "app-404", meta: { section: "app", title: "App 404" } },
      { path: "/admin/*", name: "admin-404", meta: { section: "admin", title: "Admin 404" } },

      // Global 404
      { path: "*", name: "global-404", meta: { section: "marketing", title: "Page Not Found" } },
    ],

    onBeforeNavigate: (details) => {
      // Section-specific authentication
      const targetSection = details.to.meta?.section

      if ((targetSection === "app" || targetSection === "admin") && !isAuthenticated()) {
        return "/login"
      }

      if (targetSection === "admin" && !hasRole("admin")) {
        return "/access-denied"
      }
    }
  })
}

function App() {
  const router = useRouter()
  const section = router.location.meta?.section

  return (
    <div {...router.getRootProps()}>
      {/* Section-based layout */}
      {section === "marketing" && <MarketingLayout />}
      {section === "app" && <AppLayout />}
      {section === "admin" && <AdminLayout />}
    </div>
  )
}
```

## API Reference

### Machine Options

| Option              | Type                     | Default  | Description                                  |
| ------------------- | ------------------------ | -------- | -------------------------------------------- |
| `id`                | `string`                 | -        | **Required.** Unique machine identifier      |
| `routes`            | `RouteDefinition[]`      | `[]`     | Route definitions with patterns and metadata |
| `basePath`          | `string`                 | `"/"`    | Base path for all routes                     |
| `hashRouting`       | `boolean`                | `false`  | Use hash routing instead of history API      |
| `scrollToTop`       | `boolean`                | `true`   | Scroll to top on route change                |
| `scrollRestoration` | `ScrollRestoration`      | `"auto"` | Browser scroll restoration behavior          |
| `initialLocation`   | `Partial<RouteLocation>` | -        | Override initial location (for SSR)          |
| `onBeforeNavigate`  | `function`               | -        | Guard function called before ALL navigation  |
| `onNavigate`        | `function`               | -        | Called after successful navigation           |
| `onNavigationStart` | `function`               | -        | Called when navigation begins                |
| `onNavigationEnd`   | `function`               | -        | Called when navigation completes             |
| `onNavigationError` | `function`               | -        | Called when navigation fails                 |

### Router API

| Property/Method          | Type                               | Description                                 |
| ------------------------ | ---------------------------------- | ------------------------------------------- |
| **State Properties**     |
| `location`               | `RouteLocation`                    | Current route with path, params, meta, name |
| `previousLocation`       | `RouteLocation \| null`            | Previous route location                     |
| `navigating`             | `boolean`                          | Whether navigation is in progress           |
| `canGoBack`              | `boolean`                          | Whether back navigation is possible         |
| `canGoForward`           | `boolean`                          | Whether forward navigation is possible      |
| `currentRouteName`       | `string \| undefined`              | Name of current route                       |
| `currentRouteMeta`       | `Record<string, any> \| undefined` | Metadata of current route                   |
| **Navigation Methods**   |
| `push(to, state?)`       | `function`                         | Add new entry to history                    |
| `replace(to, state?)`    | `function`                         | Replace current history entry               |
| `navigate(to, options?)` | `function`                         | Navigate with options                       |
| `back()`                 | `function`                         | Go back in history                          |
| `forward()`              | `function`                         | Go forward in history                       |
| `go(delta)`              | `function`                         | Go to specific history position             |
| **Utility Methods**      |
| `isActive(to, exact?)`   | `function`                         | Check if route is active                    |
| `createUrl(to)`          | `function`                         | Create URL for location                     |
| `parseUrl(url)`          | `function`                         | Parse URL into location object              |
| **Element Props**        |
| `getRootProps()`         | `function`                         | Props for root container element            |
| `getOutletProps()`       | `function`                         | Props for route outlet element              |
| `getLinkProps(props)`    | `function`                         | Props for navigation links                  |

### RouteDefinition Interface

```typescript
interface RouteDefinition {
  path: string; // Route pattern: "/", "/users/:id", "/admin/*", "*"
  name?: string; // Route identifier: "home", "user", "not-found"
  meta?: Record<string, any>; // Custom metadata: { title: "Home", requiresAuth: true }
}
```

### RouteLocation Interface

```typescript
interface RouteLocation {
  pathname: string; // "/users/123"
  search: string; // "?tab=settings"
  hash: string; // "#section1"
  params: Record<string, string>; // { id: "123" }
  query: Record<string, string | string[]>; // { tab: "settings", tags: ["react", "vue"] }
  meta?: Record<string, any>; // { title: "Profile", requiresAuth: true }
  name?: string; // "user"
}
```

### NavigationDetails Interface

```typescript
interface NavigationDetails {
  from: RouteLocation | null; // Source location (null for initial loads)
  to: RouteLocation; // Target location
  type: NavigationType; // "initial" | "push" | "replace" | "back" | "forward"
  source?: NavigationSource; // "initial" | "programmatic" | "user" | "browser"
}

type NavigationType = "initial" | "push" | "replace" | "back" | "forward";
type NavigationSource = "initial" | "programmatic" | "user" | "browser";
```

### LinkProps Interface

```typescript
interface LinkProps {
  to: string; // Target path: "/about", "/users/123"
  replace?: boolean; // Use replace instead of push (default: false)
  state?: any; // Navigation state data
  target?: string; // Link target: "_blank", "_self"
  rel?: string; // Link relationship: "external", "noopener"
  preventDefault?: boolean; // Prevent default click behavior (default: false)
}
```

## Best Practices

### Route Organization

```typescript
// ✅ Good: Organize by specificity (specific → general → catch-all)
const routes = [
  // Static routes first
  { path: "/", name: "home" },
  { path: "/about", name: "about" },

  // Dynamic routes next
  { path: "/users/:id", name: "user" },
  { path: "/posts/:slug", name: "post" },

  // Nested dynamic routes
  { path: "/users/:id/posts/:postId", name: "user-post" },

  // Section catch-all routes
  { path: "/admin/*", name: "admin-404" },
  { path: "/api/*", name: "api-404" },

  // Global catch-all last
  { path: "*", name: "not-found" },
];
```

### Route Metadata Best Practices

```typescript
// ✅ Good: Consistent metadata structure
const routes = [
  {
    path: "/dashboard",
    name: "dashboard",
    meta: {
      // UI metadata
      title: "Dashboard",
      layout: "app",

      // Security metadata
      requiresAuth: true,
      permissions: ["dashboard.view"],

      // Analytics metadata
      analytics: {
        section: "app",
        category: "dashboard",
      },

      // UX metadata
      loadingType: "skeleton",
      hasForm: false,
    },
  },
];
```

### Error Handling

```typescript
const router = useRouter({
  onNavigationError: (error, details) => {
    // Log for debugging
    console.error("Navigation error:", error.message, details);

    // Show user-friendly error
    if (error.message.includes("prevented")) {
      // Navigation was blocked by guard - handle gracefully
      showToast("Navigation blocked", "info");
    } else {
      // Unexpected error
      showToast("Navigation failed", "error");

      // Fallback navigation
      router.push("/");
    }
  },
});
```

### Performance Optimization

```typescript
// ✅ Good: Lazy load route components
const routes = [
  { path: "/", name: "home", meta: { component: () => import("./Home") } },
  {
    path: "/heavy-page",
    name: "heavy",
    meta: { component: () => import("./HeavyPage") },
  },
];

// ✅ Good: Debounce rapid navigation
let navigationTimeout;
const router = useRouter({
  onBeforeNavigate: (details) => {
    clearTimeout(navigationTimeout);
    navigationTimeout = setTimeout(() => {
      // Handle navigation after debounce
    }, 50);
  },
});
```

> ReadME mostly generated by AI. 😉

## License

MIT © [Abraham A](https://github.com/anubra266)
