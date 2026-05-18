import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChatGPT - Mobile',
  description: 'ChatGPT mobile experience powered by Gemini',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
