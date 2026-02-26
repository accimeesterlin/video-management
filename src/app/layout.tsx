import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Video Editor Management",
  description: "Professional video editing project management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof Node!=='undefined'&&Node.prototype&&!Node.prototype.__rcPatched){var origRC=Node.prototype.removeChild;Node.prototype.removeChild=function(child){if(child&&child.parentNode===this){return origRC.call(this,child)}return child};var origIB=Node.prototype.insertBefore;Node.prototype.insertBefore=function(newNode,refNode){if(refNode&&refNode.parentNode!==this){return origRC.call(this,newNode,null)}return origIB.call(this,newNode,refNode)};Node.prototype.__rcPatched=true}})();`,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
