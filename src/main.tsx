import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { StoreProvider } from "./context/StoreContext";
import { OffersProvider } from "./context/OffersContext";
import { SiteContentProvider } from "./context/SiteContentContext";
import "./index.css";

class HookErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  render() {
    if (this.state.crashed)
      return (
        <main className="min-h-screen grid place-content-center gap-5 px-6 text-center bg-ground text-ink">
          <h1 className="font-display text-3xl">Something went wrong</h1>
          <p>Please reload the page and try again.</p>
          <button
            className="rounded-full bg-magenta px-6 py-3 text-white"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </main>
      );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HookErrorBoundary>
      <CustomerAuthProvider>
        <OffersProvider>
          <SiteContentProvider>
            <StoreProvider>
              <App />
            </StoreProvider>
          </SiteContentProvider>
        </OffersProvider>
      </CustomerAuthProvider>
    </HookErrorBoundary>
  </React.StrictMode>,
);
