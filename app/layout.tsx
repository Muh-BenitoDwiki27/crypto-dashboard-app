import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import {fetcher} from "@/lib/coingecko.actions";
import trendingCoins from "@/components/home/TrendingCoins";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoinPulse",
  description: "Crypto Screener App with a built-in High-Frequency Terminal & Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

    // Fetch trending coins for the search modal
    // const trendingData = await fetcher<{ coins: TrendingCoin[] }>('search/trending', undefined, 300);

    // Fetch trending coins for the search modal with error handling
    let trendingCoins: TrendingCoin[] = [];

    try {
        const trendingData = await fetcher<{ coins: TrendingCoin[] }>('search/trending', undefined, 300);
        // console.log('Trending data structure:', JSON.stringify(trendingData.coins[0], null, 2));
        trendingCoins = trendingData?.coins || [];
    } catch (error) {
        console.error('Error fetching trending coins:', error);
    }


    return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header trendingCoins={trendingCoins} />
        {children}
      </body>
    </html>
  );
}
