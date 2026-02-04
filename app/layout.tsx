import type { Metadata } from "next";
import { Merriweather, Source_Sans_3, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { createClient } from '@/lib/supabase/server';
import { TesterPanel } from '@/components/tester/TesterPanel';

const merriweather = Merriweather({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const ibmPlex = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PUNC Chapters",
  description: "Find your brotherhood. Project UNcivilized chapter management.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  // Get current user and check if they're a tester
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let testerUser = null;
  if (authUser) {
    const { data: userData } = await supabase
      .from('users')
      .select('id, is_tester, is_punc_admin')
      .eq('id', authUser.id)
      .single();

    testerUser = userData;
  }

  return (
    <html lang="en">
      <body
        className={`${merriweather.variable} ${sourceSans.variable} ${ibmPlex.variable} antialiased`}
        style={{ fontFamily: 'var(--font-body, sans-serif)' }}
      >
        {children}
        {testerUser?.is_tester && (
          <TesterPanel
            user={testerUser}
            currentChapter={undefined}
            currentMeeting={undefined}
            userRole={undefined}
          />
        )}
      </body>
    </html>
  );
}
