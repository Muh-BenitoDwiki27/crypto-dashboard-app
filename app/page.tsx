import React, { Suspense } from "react";
import CoinOverview from "@/components/home/CoinOverview";
import TrendingCoins from "@/components/home/TrendingCoins";
import {CategoriesFallback, CoinOverviewFallback, TrendingCoinsFallback} from "@/components/home/fallback";
import Categories from "@/components/home/Categories";

/*
const dummyTrendingCoins: TrendingCoin[] = [
    {
        item: {
            id: 'bitcoin',
            name: 'Bitcoin',
            symbol: 'BTC',
            market_cap_rank: 1,
            thumb: '/assets/logo.svg',
            large: '/assets/logo.svg',
            data: {
                price: 89113.00,
                price_change_percentage_24h: {
                    usd: 2.5,
                }
            }
        }
    },
    {
        item: {
            id: 'ethereum',
            name: 'Ethereum',
            symbol: 'ETH',
            market_cap_rank: 2,
            thumb: '/assets/logo.svg',
            large: '/assets/logo.svg',
            data: {
                price: 2500.00,
                price_change_percentage_24h: {
                    usd: -1.2,
                }
            }
        }
    },
]

// <Image src="https://assets.coingecko.com/coins/images/1/large/bitcoin.png" alt="Bitcoin" width={56} height={56} />
*/

const Page = async () => {
  return (
    <main className="main-container">
      <section className="home-grid">
        <Suspense fallback={<CoinOverviewFallback />}>
          <CoinOverview />
        </Suspense>

        <Suspense fallback={<TrendingCoinsFallback />}>
          <TrendingCoins />
        </Suspense>
      </section>

      <section className="w-full mt-7 space-y-4">
        <Suspense fallback={<CategoriesFallback />}>
            <Categories />
        </Suspense>
      </section>
    </main>
  );
};

export default Page;
