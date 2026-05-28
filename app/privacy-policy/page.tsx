import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy — Galaxy Monkey & Icy Penguin Slide" },
  description:
    "Privacy Policy for the Galaxy Monkey and Icy Penguin Slide iOS games.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: May 27, 2026</p>

        <p>
          This Privacy Policy explains how <strong>Galaxy Monkey</strong> and{" "}
          <strong>Icy Penguin Slide</strong> ("the Apps," "we," "us," or "our")
          handle your information. We built our games to be privacy-respecting
          by design: the Apps do not collect, transmit, sell, or share any
          personal information.
        </p>

        <h2>Information We Collect</h2>
        <p>
          <strong>None.</strong> The Apps do not collect or process any personal
          data. We do not require an account, we do not ask for your name,
          email, or any other identifying information, and the Apps contain no
          analytics, advertising, or tracking technologies.
        </p>

        <h2>Data Stored on Your Device</h2>
        <p>
          The Apps save a small amount of information locally on your device so
          each game works as expected:
        </p>
        <ul>
          <li>Your best score.</li>
          <li>Your in-game settings and preferences.</li>
        </ul>
        <p>
          This data is stored only on your device using the operating system's
          standard local storage. It is never transmitted to us or to any third
          party. Deleting an App removes its data.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          The Apps do not integrate any third-party SDKs, advertising networks,
          analytics providers, or social media services. No data is shared with
          anyone.
        </p>

        <h2>Tracking</h2>
        <p>
          We do not track you across apps or websites, and we do not access the
          device advertising identifier (IDFA).
        </p>

        <h2>Children's Privacy</h2>
        <p>
          The Apps do not collect personal information from anyone, including
          children under the age of 13. Because no data is collected, the Apps
          are safe for players of all ages with respect to privacy.
        </p>

        <h2>Data Security</h2>
        <p>
          Since the Apps do not collect or transmit personal information, there
          is no personal data for us to secure on a server. Locally stored game
          data is protected by your device's built-in security.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          If we ever change how the Apps handle data, we will update this page
          and revise the "Last updated" date above. Material changes will be
          reflected in an App update where appropriate.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, contact us at:{" "}
          <a href="mailto:saleebmina@copt.dev">saleebmina@copt.dev</a>.
        </p>

        <div className={styles.note}>
          This policy applies to the Galaxy Monkey and Icy Penguin Slide iOS
          applications distributed on the Apple App Store.
        </div>

        <footer className={styles.footer}>
          © 2026 Galaxy Monkey & Icy Penguin Slide. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
