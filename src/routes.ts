import { createElement } from "react";
import RouteEffects from "./components/RouteEffects";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import HomePage from "./pages/HomePage";

export const router = createBrowserRouter([
  {
    Component: () =>
      createElement(
        "div",
        null,
        createElement(RouteEffects),
        createElement(Outlet),
      ),
    errorElement: createElement(
      "main",
      {
        className:
          "min-h-screen grid place-content-center gap-5 px-6 text-center bg-ground text-ink",
      },
      createElement(
        "h1",
        { className: "font-display text-3xl" },
        "This page could not be opened",
      ),
      createElement(
        "a",
        {
          href: "/",
          className: "rounded-full bg-magenta px-6 py-3 text-white",
        },
        "Back to shop",
      ),
    ),
    children: [
      { path: "/", Component: HomePage },
      {
        path: "/print/:sku",
        lazy: async () => ({
          Component: (await import("./pages/PrintPage")).default,
        }),
      },
      {
        path: "/categories",
        lazy: async () => ({
          Component: (await import("./pages/CategoriesPage")).default,
        }),
      },
      {
        path: "/gallery-sets",
        lazy: async () => ({
          Component: (await import("./pages/GallerySetsPage")).default,
        }),
      },
      {
        path: "/custom-poster",
        lazy: async () => ({
          Component: (await import("./pages/CustomPosterPage")).default,
        }),
      },
      {
        path: "/faq",
        lazy: async () => ({
          Component: (await import("./pages/FaqPage")).default,
        }),
      },
      {
        path: "/about",
        lazy: async () => ({
          Component: (await import("./pages/AboutPage")).default,
        }),
      },
      {
        path: "/shipping",
        lazy: async () => ({
          Component: (await import("./pages/ShippingPage")).default,
        }),
      },
      {
        path: "/contact",
        lazy: async () => ({
          Component: (await import("./pages/ContactPage")).default,
        }),
      },
      {
        path: "/privacy",
        lazy: async () => ({
          Component: (await import("./pages/PrivacyPage")).default,
        }),
      },
      {
        path: "/help",
        lazy: async () => ({
          Component: (await import("./pages/HelpPage")).default,
        }),
      },
      {
        path: "/track",
        lazy: async () => ({
          Component: (await import("./pages/HelpPage")).default,
        }),
      },
      {
        path: "/account",
        lazy: async () => ({
          Component: (await import("./pages/AccountPage")).default,
        }),
      },
      {
        path: "/admin",
        lazy: async () => ({
          Component: (await import("./pages/admin/AdminRoutes")).AdminEntry,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("./pages/admin/AdminLoginPage")).default,
            }),
          },
          {
            path: "preview/:section?",
            lazy: async () => ({
              Component: (await import("./pages/admin/AdminRoutes"))
                .AdminPreview,
            }),
          },
          {
            lazy: async () => ({
              Component: (await import("./pages/admin/AdminRoutes")).AdminGuard,
            }),
            children: [
              ...[
                "dashboard",
                "prints",
                "tags",
                "categories",
                "content",
                "orders",
                "customers",
                "reviews",
                "offers",
                "settings",
              ].map((path) => ({
                path,
                lazy: async () => ({
                  Component: (await import("./pages/admin/AdminRoutes"))
                    .AdminLive,
                }),
              })),
              {
                path: "site-content",
                Component: () =>
                  createElement(Navigate, {
                    to: "/admin/content",
                    replace: true,
                  }),
              },
              {
                path: "enquiries",
                Component: () =>
                  createElement(Navigate, {
                    to: "/admin/orders",
                    replace: true,
                  }),
              },
            ],
          },
          {
            path: "*",
            Component: () =>
              createElement(Navigate, { to: "/admin", replace: true }),
          },
        ],
      },
      {
        path: "*",
        Component: () => createElement(Navigate, { to: "/", replace: true }),
      },
    ],
  },
]);
