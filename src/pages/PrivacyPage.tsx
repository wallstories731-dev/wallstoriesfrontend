import { useSiteContent } from "../context/SiteContentContext";
import AnnouncementBar from "../components/AnnouncementBar";
import SiteNav from "../components/SiteNav";
import Footer from "../components/Footer";
import { Link } from "react-router";
import { useStore } from "../context/StoreContext";

export default function PrivacyPage() {
  const { cartCount } = useStore();
  const { content } = useSiteContent();
  return (
    <div className="min-h-screen bg-ground text-ink">
      <AnnouncementBar />
      <SiteNav cartCount={cartCount} bumped={false} onOpenCart={() => {}} />
      <main className="mx-auto max-w-[720px] px-4 py-14 sm:px-8 sm:py-20">
        <p className="text-xs uppercase tracking-[.2em] text-magenta">
          Your information
        </p>
        <h1 className="mt-3 mb-10 font-display text-4xl font-semibold">
          Privacy &amp; your data
        </h1>
        {content.copy?.privacyIntro && (
          <p className="mb-9 whitespace-pre-line text-sm leading-7">
            {content.copy.privacyIntro}
          </p>
        )}
        <div className="space-y-9 text-sm leading-7 text-ink-soft">
          <section>
            <h2 className="text-xl font-semibold text-ink">
              Saved on your device
            </h2>
            <p>
              Your selection, wishlist and arcade best scores can be saved in
              this browser so they are available when you return. You can remove
              your selection and wishlist in the shop or clear this site's
              browser storage.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-ink">
              Messages and custom artwork
            </h2>
            <p>
              Contact and custom-print forms prepare a message for you to copy
              into Instagram. You choose when to send it. A custom image preview
              stays on your device; attach the original image in the chat
              yourself. Customer contact details are not saved in browser
              storage.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-ink">Online orders</h2>
            <p>
              If online checkout is enabled, the shop sends the contact,
              delivery and selection details needed to create and fulfil your
              order to its configured order service. The payment provider
              handles payment details. The shop does not store card details.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-ink">
              Accounts and photo reviews
            </h2>
            <p>
              When account services are enabled, your email and account name are
              sent to the configured account provider. Sign-in tokens stay in
              memory and are not saved in browser storage. A review photo
              preview stays on your device until you submit it. Submitted
              photos, review text, name, optional city and rating are stored for
              approval. By checking the consent box, you agree to show them
              publicly after approval. Contact the shop to request removal.
              Sample gallery content is labeled for inspiration.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-ink">
              External services
            </h2>
            <p>
              Opening Instagram takes you to an external service. Artwork images
              and fonts may load from external providers, which receive the
              network information needed to deliver those assets.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-ink">
              Questions or removal requests
            </h2>
            <p>
              Contact the shop with your order reference to ask about
              information you have shared or request its removal.
            </p>
            <Link
              to="/contact"
              className="mt-4 inline-flex rounded-full bg-magenta px-6 py-3 text-white"
            >
              Contact the shop
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
