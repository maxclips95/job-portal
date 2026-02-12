import type { Metadata } from 'next';
import './globals.css';
import AxiosBootstrap from '@/components/AxiosBootstrap';
import MainNav from '@/components/MainNav';

export const metadata: Metadata = {
  title: 'Job Portal - Find Your Dream Job',
  description: 'Modern job portal to find jobs and hire talent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AxiosBootstrap />
        <MainNav />
        {children}
      </body>
    </html>
  );
}
