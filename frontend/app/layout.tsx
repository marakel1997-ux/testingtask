import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata = {
  title: 'GiftCircle',
  description: 'Social wishlist app'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
